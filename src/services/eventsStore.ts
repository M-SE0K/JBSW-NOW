import "../db/firebase";
import { getFirestore, addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import type { ContestFromImage, GeminiAnalysisResult, Org, Event } from "../types";
import { cleanCrawledText } from "../utils/textCleaner";
import { checkAndCreateNotificationsForNewEvent } from "./userNotifications";
import { ALLOWED_TAGS, type AllowedTag } from "./tags";

/**
 * Firestore 저장 전담 모듈(eventsStore)
 * - 역할: Gemini 분석 결과를 받아 Firestore `events` 컬렉션에 저장
 * - 분리 의도: Gemini API 호출(분석)과 DB 저장을 느슨하게 결합하기 위함
 */

/**
 * 이벤트 저장 파라미터 스키마
 * - sourceUrl: 원문/크롤링 출처 URL
 * - analysis: Gemini 분석 결과(rawText, extracted JSON 등)
 * - tags: 추론된 태그 목록
 * - org: 주최 기관 정보
 * - posterImageUrl: 외부 포스터 이미지 URL(선택)
 */
export type SaveEventParams = {
  sourceUrl: string | null;
  analysis: GeminiAnalysisResult;
  tags: string[];
  org: Org;
  posterImageUrl?: string | null;
  postTitle?: string | null;
};

/**
 * Firestore `events` 컬렉션에 이벤트 문서를 저장합니다.
 * - Gemini 추출 JSON(extracted)에서 제목/요약/일정/연락처 등을 매핑
 * - AI 메타데이터(ai)와 서버 타임스탬프(createdAt/updatedAt) 기록
 * @returns 생성된 문서 ID
 */
export async function saveEventToFirestore(params: SaveEventParams): Promise<string> {
  const db = getFirestore();
  const ex: ContestFromImage | undefined = params.analysis.extracted;

  const cleanedRaw = cleanCrawledText(params.analysis.rawText);
  const title = ex?.title || deriveTitle(cleanedRaw);
  const summary = ex?.summary || trimSummary(cleanedRaw, 300);
  const startAt = ex?.eventStart || null;
  const endAt = ex?.eventEnd || null;

  // postTitle 파생: 제공값 → AI 산출 → 로컬 유도 (기관명/카테고리/마감일)
  const category = deriveCategory(ex, cleanedRaw, params.tags);
  const deadline = ex?.applyEnd || ex?.eventEnd || ex?.eventStart || deriveDeadlineFromText(cleanedRaw);
  const derivedOrg = deriveOrgName(params.org?.name || "", cleanedRaw);
  const localPostTitle = derivedOrg && deadline ? `${derivedOrg} (${category}) ${deadline}` : null;
  const finalPostTitle = params.postTitle ?? ex?.postTitle ?? localPostTitle ?? null;
  if (finalPostTitle) console.log("[DB] saveEvent postTitle:", finalPostTitle);

  const docData = {
    title,
    postTitle: finalPostTitle,
    summary,
    startAt,
    endAt,
    posterImageUrl: params.posterImageUrl ?? null,
    location: ex?.location ?? null,
    prize: ex?.prize ?? null,
    contactEmail: ex?.contactEmail ?? null,
    contactPhone: ex?.contactPhone ?? null,
    links: ex?.links ?? [],
    tags: params.tags,
    org: params.org,
    sourceUrl: params.sourceUrl,
    ai: {
      rawText: cleanedRaw,
      extracted: ex ?? null,
      model: "gemini-2.0-flash-lite",
      processedAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as const;

  const ref = await addDoc(collection(db, "events"), docData);
  const eventId = ref.id;

  // 새 게시물 저장 후 관심 태그 매칭하여 알림 생성 (비동기, 블로킹 없음)
  // 태그가 있고 AllowedTag 형식인 경우에만 알림 생성
  const validTags = params.tags.filter((tag): tag is AllowedTag => 
    ALLOWED_TAGS.includes(tag as AllowedTag)
  );
  
  if (validTags.length > 0) {
    // Event 객체 생성
    const event: Event = {
      id: eventId,
      title,
      postTitle: finalPostTitle,
      summary,
      startAt: startAt || new Date().toISOString(),
      endAt: endAt || null,
      location: ex?.location ?? null,
      tags: validTags,
      org: params.org,
      sourceUrl: params.sourceUrl,
      posterImageUrl: params.posterImageUrl ?? null,
      ai: {
        rawText: cleanedRaw,
        extracted: ex ?? null,
      },
    };

    // 알림 생성 (비동기, 에러는 로그만)
    checkAndCreateNotificationsForNewEvent(event).catch((e) => {
      console.warn("[EVENTS_STORE] Failed to create notifications for new event", e);
    });
  }

  return eventId;
}

/**
 * 원시 텍스트의 첫 줄을 사용해 간이 제목을 생성합니다.
 */
function deriveTitle(raw: string): string {
  const firstLine = (raw || "").split(/\n+/)[0]?.trim() || "제목 미상";
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;
}

/**
 * 원시 텍스트를 공백 정리 후 최대 길이에 맞춰 요약 문자열로 자릅니다.
 */
function trimSummary(raw: string, max: number): string {
  const t = (raw || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 3) + "..." : t;
}

// 간단 카테고리 파생: 태그/문맥 기반
function deriveCategory(ex: ContestFromImage | undefined, raw: string, tags: string[]): string {
  const text = (raw || "") + " " + JSON.stringify(ex || {});
  const lc = text.toLowerCase();
  if (tags.includes("career") || /채용|채용공고|신입|정규직|인턴/.test(text)) return "채용정보";
  if (tags.includes("contest") || /공모전|경진대회|해커톤/.test(text)) return "공모전";
  if (/해커톤/.test(text)) return "해커톤";
  if (tags.includes("seminar") || /세미나|강연|설명회|설명/.test(text)) return "학습";
  return "정보";
}

// 간단 기관명 파생: 괄호/특수기호 제거 후 앞쪽 어절에서 기업/기관 후보 추출
function deriveOrgName(orgName: string, raw: string): string | null {
  const candidates: string[] = [];
  if (orgName) candidates.push(orgName);
  const lines = (raw || "").split(/\n+/).slice(0, 6);
  // 우선순위 1) 대괄호 안 회사/기관명
  for (const line of lines) {
    const mBr = line.match(/\[\s*([가-힣A-Za-z0-9·&()]+)\s*\]/);
    if (mBr && mBr[1]) {
      candidates.push(mBr[1]);
      break;
    }
  }
  for (const line of lines) {
    const cleanLine = line.replace(/^\[[^\]]*\]\s*/, "");
    const m = cleanLine.match(/^(?:\(주\)|㈜)?\s*([가-힣A-Za-z0-9·&()]{2,}(?:\s*[가-힣A-Za-z0-9·&()]{0,})?)/);
    if (m) candidates.push(m[1].trim());
  }
  const cleaned = candidates
    .map((s) => s.replace(/[\[\]"'<>]/g, "").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);
  return cleaned[0] || null;
}

// 텍스트에서 YYYY.MM.DD 또는 YY.MM.DD/ MM.DD 등의 날짜를 찾아 마감일 후보를 반환(YYYY-MM-DD)
function deriveDeadlineFromText(raw: string): string | null {
  const text = raw || "";
  // 연도 포함 전체 날짜
  const fullDateRe = /(20\d{2})[\.\/-](\d{1,2})[\.\/-](\d{1,2})/g;
  const foundFull: Array<{ y: number; m: number; d: number; idx: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = fullDateRe.exec(text))) {
    foundFull.push({ y: parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10), idx: m.index });
  }
  // 월.일 형태(연도 없음)
  const mdRe = /(\d{1,2})[\.\/-](\d{1,2})/g;
  const foundMD: Array<{ m: number; d: number; idx: number }> = [];
  while ((m = mdRe.exec(text))) {
    // 이미 fullDate로 잡힌 패턴은 제외
    const seg = m[0];
    if (/20\d{2}/.test(seg)) continue;
    foundMD.push({ m: parseInt(m[1], 10), d: parseInt(m[2], 10), idx: m.index });
  }

  // 마감 후보: 물결(~) 뒤쪽 날짜 또는 마지막 등장 날짜
  const waveIdx = text.indexOf("~");
  let y = (foundFull[0]?.y) || new Date().getFullYear();
  let target: { y: number; m: number; d: number } | null = null;
  const pick = (arr: Array<{ y?: number; m: number; d: number; idx: number }>) => {
    if (!arr.length) return null;
    let cand = arr[arr.length - 1];
    if (waveIdx >= 0) {
      const after = arr.filter((x) => x.idx > waveIdx);
      if (after.length) cand = after[after.length - 1];
    }
    return cand;
  };

  if (foundFull.length) {
    const cand = pick(foundFull);
    if (cand) target = { y: cand.y!, m: cand.m, d: cand.d };
  } else if (foundMD.length) {
    const cand = pick(foundMD);
    if (cand) target = { y, m: cand.m, d: cand.d };
  }
  if (!target) return null;
  const mm = String(Math.max(1, Math.min(12, target.m))).padStart(2, "0");
  const dd = String(Math.max(1, Math.min(31, target.d))).padStart(2, "0");
  return `${target.y}-${mm}-${dd}`;
}


