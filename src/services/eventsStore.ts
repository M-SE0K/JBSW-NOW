import "../db/firebase";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { ContestFromImage, GeminiAnalysisResult, Org } from "../types";

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

  const title = ex?.title || deriveTitle(params.analysis.rawText);
  const summary = ex?.summary || trimSummary(params.analysis.rawText, 300);
  const startAt = ex?.eventStart || null;
  const endAt = ex?.eventEnd || null;

  const docData = {
    title,
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
      rawText: params.analysis.rawText,
      extracted: ex ?? null,
      model: "gemini-2.0-flash-lite",
      processedAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as const;

  const ref = await addDoc(collection(db, "events"), docData);
  return ref.id;
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


