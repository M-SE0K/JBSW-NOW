// Firebase Firestore 초기화 및 필요한 함수 import
import "../db/firebase";

// Gemini API를 활용한 분석 함수 및 타입 import
import { analyzePosterImage, analyzePosterText } from "../api/gemini/gemini";
import { GeminiAnalysisResult, Org } from "../types";
import { saveEventToFirestore } from "./eventsStore";

// === 타입 정의 ===
// 텍스트 입력 구조
export type IngestInputText = {
  text: string; // 포스터 텍스트
  sourceUrl?: string | null; // 원본 출처 URL
  org?: Org; // 주최 기관 정보
};

// 이미지 입력 구조
export type IngestInputImage = {
  uri: string; // 이미지 URI (http(s), file:// 등)
  sourceUrl?: string | null;
  org?: Org;
};

// 결과 구조
export type IngestResult = {
  eventId: string; // Firestore 문서 ID
  analysis: GeminiAnalysisResult; // Gemini 분석 결과
  tags: string[]; // 태그 목록
};

// 기본 Org 객체 (org 정보 없을 때 사용)
const DEFAULT_ORG: Org = {
  id: "unknown",
  name: "Unknown",
  logoUrl: null,
  homepageUrl: null,
};

// === 텍스트 입력 처리 ===
export async function processCrawledText(input: IngestInputText): Promise<IngestResult> {
  // Gemini API를 통해 텍스트 분석
  const analysis = await analyzePosterText({ text: input.text });

  // 분석 결과에서 태그 추론
  const tags = inferTags(analysis);

  // Firestore 저장 후 문서 ID 반환
  const docId = await saveEventToFirestore({
    sourceUrl: input.sourceUrl ?? null,
    analysis,
    tags,
    org: input.org ?? DEFAULT_ORG,
  });

  // 결과 반환
  return { eventId: docId, analysis, tags };
}

// === 이미지 입력 처리 ===
export async function processCrawledImage(input: IngestInputImage): Promise<IngestResult> {
  // Gemini API를 통해 이미지 분석
  const analysis = await analyzePosterImage({ uri: input.uri });

  // 분석 결과에서 태그 추론
  const tags = inferTags(analysis);

  // Firestore 저장 후 문서 ID 반환
  const docId = await saveEventToFirestore({
    sourceUrl: input.sourceUrl ?? null,
    analysis,
    tags,
    org: input.org ?? DEFAULT_ORG,
  });

  // 결과 반환
  return { eventId: docId, analysis, tags };
}

// === 태그 추론 함수 ===
function inferTags(analysis: GeminiAnalysisResult): string[] {
  // 원시 텍스트 + 추출 데이터(JSON)를 소문자로 변환
  const text = `${analysis.rawText}\n${JSON.stringify(analysis.extracted ?? {})}`.toLowerCase();
  const tags = new Set<string>();
  const add = (t: string) => tags.add(t);

  // 키워드 기반 태그 추가
  if (/경진대회|콘테스트|해커톤|대회/.test(text)) add("contest");
  if (/채용|인턴|공채|커리어|잡페어/.test(text)) add("career");
  if (/세미나|강연|특강|워크숍|콘퍼런스|컨퍼런스/.test(text)) add("seminar");
  if (/장학|장학금|scholar/.test(text)) add("scholarship");
  if (/신청|접수|등록|apply|register/.test(text)) add("apply");
  if (/마감|deadline|마감일/.test(text)) add("deadline");
  if (/상금|prize|시상/.test(text)) add("prize");

  // 이벤트 시작/종료일 있으면 일정성 태그 부여
  const ex = analysis.extracted;
  if (ex?.eventStart || ex?.eventEnd) add("scheduled");

  return Array.from(tags);
}

// === Firestore 저장 함수 ===
// Firestore 저장 로직은 `src/services/eventsStore.ts`로 분리됨
