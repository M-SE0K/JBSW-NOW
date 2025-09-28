// 알림(푸시/로컬) 유틸리티와 시뮬레이터용 notices 폴링 워처를 제공합니다.
// - 실기기: 푸시 권한/토큰 요청(requestPushPermissionsAndToken)
// - 시뮬레이터: 로컬 알림 권한만 요청(requestLocalNotificationPermission)
// - 공통: presentLocalNotification으로 즉시 표시 + AsyncStorage에 영구 저장
// - 폴링: Firestore의 notices 컬렉션을 주기적으로 확인하여 새 글을 알림으로 띄움(+Gemini 요약)

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "../api/client";
import { getFirestore, collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { cleanCrawledText } from "../utils/textCleaner";
import { analyzePosterText } from "../api/gemini/gemini";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 로컬에 저장할 알림 항목 스키마(알림 리스트 화면에서 재사용)
export type LocalNotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  data?: Record<string, any> | null;
  createdAt: string; // ISO
};

// AsyncStorage 키(알림 히스토리 저장소)
const LOCAL_NOTIF_KEY = "localNotifications";

// 저장소에서 알림 히스토리를 읽어옵니다.
async function loadLocalNotifications(): Promise<LocalNotificationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_NOTIF_KEY);
    const arr = raw ? (JSON.parse(raw) as LocalNotificationItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// 알림 히스토리를 저장소에 저장합니다.
async function saveLocalNotifications(items: LocalNotificationItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_NOTIF_KEY, JSON.stringify(items));
  } catch {}
}

// 외부에서 현재 알림 히스토리를 가져옵니다.
export async function getLocalNotifications(): Promise<LocalNotificationItem[]> {
  return await loadLocalNotifications();
}

// 알림 히스토리를 모두 삭제하고 구독자에게 변경을 알립니다.
export async function clearLocalNotifications(): Promise<void> {
  await saveLocalNotifications([]);
  notifyLocalListeners();
}

// 새 알림을 히스토리에 앞쪽으로 추가하고 상한 개수(200)를 유지합니다.
async function appendLocalNotification(item: LocalNotificationItem): Promise<void> {
  const before = await loadLocalNotifications();
  const next = [item, ...before].slice(0, 200);
  await saveLocalNotifications(next);
  notifyLocalListeners();
}

// 알림 히스토리 변경 구독(알림 화면이 사용)
type Listener = () => void;
const localListeners = new Set<Listener>();

export function subscribeLocalNotifications(listener: Listener): () => void {
  localListeners.add(listener);
  return () => localListeners.delete(listener);
}

// 구독자에게 변경을 브로드캐스트합니다.
function notifyLocalListeners() {
  for (const l of Array.from(localListeners)) {
    try { l(); } catch {}
  }
}

// 앱 전역 알림 핸들러 등록
// - iOS: shouldShowBanner/shouldShowList를 켜서 즉시 배너/리스트 표시
export function setupNotificationHandler() {
  console.log("[NOTIF] installing notification handler");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      // 최신 타입 호환(iOS 배너/리스트 표시 허용)
      shouldShowBanner: true as any,
      shouldShowList: true as any,
    }),
  });
  console.log("[NOTIF] notification handler installed");
}

// 실기기용 푸시 권한 및 Expo Push 토큰 요청 후 백엔드에 등록
export async function requestPushPermissionsAndToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[NOTIF] not a physical device; skipping push token request");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log("[NOTIF] permission: existing status", existingStatus);
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("[NOTIF] permission: requested →", status);
  }
  if (finalStatus !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("[NOTIF] got expo push token", token?.slice?.(0, 12) || token);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
    console.log("[NOTIF] android channel set: default");
  }

  try {
    // 백엔드에 토큰 등록
    await api.post("/devices", { expoPushToken: token });
    console.log("[NOTIF] device token registered to backend");
  } catch (e) {
    // TODO: 로깅/재시도 정책
    console.warn("[NOTIF] backend token register failed", e);
  }

  return token;
}

// 시뮬레이터용: 로컬 알림 권한만 요청(푸시 토큰 미수집)
export async function requestLocalNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("[NOTIF] local-only permission: existing status", existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("[NOTIF] local-only permission: requested →", status);
    }
    return finalStatus === "granted";
  } catch (e) {
    console.warn("[NOTIF] local-only permission request failed", e);
    return false;
  }
}

// 즉시(Local) 알림을 표시하고, 동일 내용을 로컬 히스토리에 저장합니다.
export async function presentLocalNotification(title: string, body?: string | null, data?: Record<string, any>) {
  try {
    console.log("[NOTIF] present local notification", {
      title: title?.slice?.(0, 80) || title,
      bodyLen: body ? body.length : 0,
      hasData: !!data,
    });
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body || undefined,
        data,
      },
      trigger: null, // 즉시 표시
    });
    console.log("[NOTIF] local notification scheduled (immediate)");
    const createdAt = new Date().toISOString();
    const id = `${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
    await appendLocalNotification({ id, title, body: body || null, data: data || null, createdAt });
  } catch (_) {
    // noop
    console.warn("[NOTIF] present local notification failed");
  }
}

// notices 폴링 워처(시뮬레이터용):
// - firebase_created_at 기준으로 최신 N건을 조회
// - 첫 폴링에서는 기준 시점을 설정하고 종료
// - 이후 폴링에서 기준 이후 문서만 골라 알림 발송
// - Gemini(analyzePosterText)로 제목/요약을 생성(실패 시 원문/정제본 폴백)
let pollingTimer: any = null;
let lastSeenIso: string | null = null;

export function startNoticesPolling({ intervalMs = 30_000, batch = 10 }: { intervalMs?: number; batch?: number } = {}) {
  if (pollingTimer) return;
  console.log("[NOTICES] start polling", { intervalMs, batch });
  pollingTimer = setInterval(async () => {
    try {
      const startedAt = Date.now();
      console.log("[NOTICES] poll tick:start");
      const db = getFirestore();
      const ref = collection(db, "notices");
      const snap = await getDocs(query(ref, orderBy("firebase_created_at", "desc"), limit(batch)));
      // 최신 공지 목록을 간략 스키마로 변환
      const items: Array<{ id: string; title: string; content?: string | null; created?: string | null; url?: string | null }>= [];
      snap.forEach((d: any) => {
        const v = d.data() as any;
        items.push({
          id: d.id,
          title: String(v?.title || ""),
          content: typeof v?.content === "string" ? v.content : typeof v?.content_html === "string" ? v.content_html : null,
          created: v?.firebase_created_at || v?.createdAt || v?.date || null,
          url: v?.url || null,
        });
      });
      if (!items.length) return;
      const newest = items[0];
      if (!lastSeenIso) {
        // 첫 실행: 기준선 기록만 하고 알림은 보내지 않음(과거 데이터 폭주 방지)
        lastSeenIso = newest.created || new Date().toISOString();
        console.log("[NOTICES] baseline set", { lastSeenIso });
        return; // 첫 실행은 베이스라인만 기록
      }
      // 새 글만 알림 (created가 lastSeen 이후)
      const news = items.filter((it) => {
        if (!it.created) return false;
        try { return new Date(it.created).getTime() > new Date(lastSeenIso!).getTime(); } catch { return false; }
      });
      if (news.length) {
        lastSeenIso = news[0].created || lastSeenIso;
        console.log("[NOTICES] new items", { count: news.length, ids: news.map((n) => n.id) });
        for (const n of news.reverse()) {
          // 기본(폴백) 제목/본문
          let titleOut: string = n.title?.slice(0, 60) || "새 소식";
          let bodyOut: string | undefined = n.content ? cleanCrawledText(n.content, { maxLength: 140 }) : undefined;
          // Gemini가 제목/요약을 선정하도록 시도 (API 키 없거나 실패하면 폴백)
          try {
            const sourceText = (typeof n.content === "string" && n.content.trim()) ? n.content : n.title;
            if (sourceText && sourceText.length > 0) {
              console.log("[NOTICES][AI] analyze start", { id: n.id });
              const ai = await analyzePosterText({ text: sourceText });
              const aiTitle = ai?.extracted?.postTitle || ai?.extracted?.title;
              const aiSummary = ai?.extracted?.summary || ai?.rawText;
              if (typeof aiTitle === "string" && aiTitle.trim()) titleOut = aiTitle.slice(0, 60);
              if (typeof aiSummary === "string" && aiSummary.trim()) bodyOut = cleanCrawledText(aiSummary, { maxLength: 140 });
              console.log("[NOTICES][AI] analyze done", { id: n.id, hasTitle: !!aiTitle, hasSummary: !!aiSummary });
            }
          } catch (e) {
            console.warn("[NOTICES][AI] analyze failed", e);
          }
          // 즉시 로컬 알림 + 히스토리 저장
          await presentLocalNotification(titleOut, bodyOut, { noticeId: n.id, url: n.url || undefined });
        }
      }
      console.log("[NOTICES] poll tick:end", { ms: Date.now() - startedAt });
    } catch (_) {}
  }, intervalMs);
}

// 폴링 중지(앱 종료/백그라운드 등에서 호출)
export function stopNoticesPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    console.log("[NOTICES] polling stopped");
  }
}


