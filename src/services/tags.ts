import type { Event } from "../types";
import { analyzePosterImage, analyzePosterText } from "../api/gemini/gemini";
import "../db/firebase";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";

export const ALLOWED_TAGS = [
  "수강",
  "졸업",
  "학사",
  "일반",
  "대학원",
  "취업",
  "공모전",
  "봉사활동",
  "교내활동",
  "대외활동",
] as const;

export type AllowedTag = typeof ALLOWED_TAGS[number];

// 태그별 색상 매핑
export const TAG_COLORS: Record<string, { bg: string; text: string; border?: string }> = {
  "수강": { bg: "#E3F2FD", text: "#1976D2", border: "#BBDEFB" },
  "졸업": { bg: "#F3E5F5", text: "#7B1FA2", border: "#CE93D8" },
  "학사": { bg: "#E8F5E9", text: "#388E3C", border: "#A5D6A7" },
  "일반": { bg: "#FAFAFA", text: "#616161", border: "#E0E0E0" },
  "대학원": { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  "취업": { bg: "#FFEBEE", text: "#C62828", border: "#EF9A9A" },
  "공모전": { bg: "#E1F5FE", text: "#0277BD", border: "#81D4FA" },
  "봉사활동": { bg: "#F1F8E9", text: "#558B2F", border: "#AED581" },
  "교내활동": { bg: "#FCE4EC", text: "#C2185B", border: "#F48FB1" },
  "대외활동": { bg: "#E0F2F1", text: "#00695C", border: "#80CBC4" },
};

const cache = new Map<string, AllowedTag[]>();

// 최근 동기화된 기준 해시를 보관해 중복 쓰기를 방지합니다.
const lastSyncedBasisHashByEventId = new Map<string, string>();

function clean(text?: string | null): string {
  if (!text || typeof text !== "string") return "";
  return String(text).replace(/\s+/g, " ").trim();
}

function pickTopTags(tags: AllowedTag[]): AllowedTag[] {
  const uniq: AllowedTag[] = [];
  for (const t of tags) {
    if (!uniq.includes(t)) uniq.push(t);
    if (uniq.length >= 3) break;
  }
  return uniq.length > 0 ? uniq : ["일반"];
}

function keywordToTags(text: string): AllowedTag[] {
  const src = text.toLowerCase();
  const out: AllowedTag[] = [];

  // 취업
  if (/(채용|인턴|취업|공채|경력|신입|recruit|모집공고|산학협력)/i.test(src)) out.push("취업");
  // 공모전
  if (/(공모전|해커톤|대회|콘테스트|챌린지)/i.test(src)) out.push("공모전");
  // 봉사활동
  if (/(봉사|자원봉사|봉사활동)/i.test(src)) out.push("봉사활동");
  // 대학원
  if (/(대학원|석사|박사|연구실|랩\b|seminar|세미나)/i.test(src)) out.push("대학원");
  // 수강
  if (/(수강|강의|과목|수업|청강|교양|전공과목|강좌)/i.test(src)) out.push("수강");
  // 졸업
  if (/(졸업|학위수여|논문|졸업요건|학위)/i.test(src)) out.push("졸업");
  // 학사
  if (/(학사|휴학|복학|전과|편입|성적|수강신청|등록금|학적|성적정정|장학생||학생||재(복)학생)/i.test(src)) out.push("학사");
  // 교내활동
  if (/(멘토|멘티|TA)/i.test(src)) out.push("교내활동");
  // 대외활동
  if (/(대외활동|봉사|자원봉사|봉사활동)/i.test(src)) out.push("대외활동");
  
  return pickTopTags(out);
}

async function analyzeEventWithGemini(event: Event): Promise<{ raw: string; mergedText: string } | null> {
  try {
    const title = clean(event.title);
    const summary = clean(event.summary);
    const baseText = [title, summary].filter(Boolean).join("\n");

    if (event.posterImageUrl && clean(event.posterImageUrl)) {
      const ai = await analyzePosterImage({ uri: event.posterImageUrl! });
      const raw = clean(ai?.rawText);
      const ex = ai?.extracted;
      const merged = [
        baseText,
        raw,
        clean(ex?.title),
        clean(ex?.summary),
        clean(ex?.location),
        clean(ex?.prize),
        (ex?.links || []).join(" \n"),
      ]
        .filter(Boolean)
        .join("\n");
      return { raw, mergedText: merged };
    }

    const effectiveText = baseText || "";
    if (!effectiveText) return null;
    const ai = await analyzePosterText({ text: effectiveText });
    const raw = clean(ai?.rawText);
    const ex = ai?.extracted;
    const merged = [
      baseText,
      raw,
      clean(ex?.title),
      clean(ex?.summary),
      clean(ex?.location),
      clean(ex?.prize),
      (ex?.links || []).join(" \n"),
    ]
      .filter(Boolean)
      .join("\n");
    return { raw, mergedText: merged };
  } catch (e) {
    console.warn("[TAGS] Gemini analyze error", e);
    return null;
  }
}

export async function classifyEventTags(event: Event): Promise<AllowedTag[]> {
  const cacheKey = event.id;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const title = clean(event.title);
  const summary = clean(event.summary);
  const quick = keywordToTags([title, summary].filter(Boolean).join(" \n "));

  // 빠른 키워드로 충분하면 그대로 사용
  if (quick && quick.length > 0 && !(quick.length === 1 && quick[0] === "일반")) {
    cache.set(cacheKey, quick);
    return quick;
  }

  // Gemini 분석 병행 시도
  const ai = await analyzeEventWithGemini(event);
  if (ai) {
    const aiTags = keywordToTags(ai.mergedText);
    const merged = pickTopTags([...(quick || []), ...aiTags]);
    cache.set(cacheKey, merged);
    return merged;
  }

  cache.set(cacheKey, quick);
  return quick;
}

export async function enrichEventsWithTags(events: Event[]): Promise<Event[]> {
  const enriched = await Promise.all(
    events.map(async (ev) => {
      try {
        const tags = await classifyEventTags(ev);
        const updated: Event = { ...ev, tags } as Event;
        // Firestore 동기화는 비차단으로 진행합니다.
        try {
          // 원본(ev)의 태그와 새 태그를 비교해 필요 시 동기화
          maybeSyncTagsToFirestore(ev, tags);
        } catch {}
        return updated;
      } catch {
        return { ...ev, tags: ["일반"] } as Event;
      }
    })
  );
  return enriched;
}


// === Firestore 동기화 유틸 ===
function computeBasisHash(ev: Event): string {
  const basis = [ev.title || "", ev.summary || "", ev.posterImageUrl || ""].join("\n");
  // djb2 해시 (간단, 빠름)
  let h = 5381;
  for (let i = 0; i < basis.length; i++) {
    h = ((h << 5) + h) + basis.charCodeAt(i);
    h = h | 0;
  }
  return String(h >>> 0);
}

function arraysEqualIgnoreOrder(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
  return true;
}

function isPersistableEventId(id: string): boolean {
  // Firestore `events` 컬렉션 문서로 추정되는 ID만 허용
  if (id.startsWith("notice-")) return false;
  if (id.startsWith("notif-")) return false;
  return true;
}

async function syncTagsToFirestore(ev: Event, tags: AllowedTag[], basisHash: string): Promise<void> {
  const db = getFirestore();
  const ref = doc(db, "events", ev.id);
  const payload: any = {
    tags,
    tagMeta: {
      source: "client-gemini",
      modelVersion: "gemini-2.0-flash-lite",
      basisHash,
      updatedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  };
  await updateDoc(ref, payload);
}

function maybeSyncTagsToFirestore(ev: Event, tags: AllowedTag[]): void {
  try {
    if (!ev?.id || !isPersistableEventId(ev.id)) return;
    const normalized = (tags || []).map((t) => String(t).trim()).filter(Boolean);
    if (normalized.length === 0) return;
    if (arraysEqualIgnoreOrder(ev.tags || [], normalized)) {
      return;
    }
    const basisHash = computeBasisHash(ev);
    const last = lastSyncedBasisHashByEventId.get(ev.id);
    if (last && last === basisHash) return;
    lastSyncedBasisHashByEventId.set(ev.id, basisHash);
    // 비동기 실행(에러는 콘솔에만 기록)
    void syncTagsToFirestore(ev, normalized as AllowedTag[], basisHash).catch((e) => {
      console.warn("[TAGS] syncTagsToFirestore error", { id: ev.id, e });
    });
  } catch {}
}


