import { cleanCrawledText } from "../utils/textCleaner";
import { saveEventToFirestore } from "./eventsStore";
import type { Org } from "../types";

export type RepostParams = {
  text: string;            // 크롤링 원문 텍스트
  sourceUrl?: string|null; // 출처
  org?: Org;               // 조직 정보
  posterImageUrl?: string|null; // 포스터 이미지 URL(선택)
};

/**
 * 크롤링 원문 텍스트를 정제한 뒤 Gemini 없이 그대로 리포스트 저장합니다.
 * - 제목/요약은 eventsStore 내부 규칙(첫 줄, 길이 제한)으로 산출됩니다.
 * - 게시일자는 Firestore serverTimestamp로 기록됩니다.
 */
export async function repostCleanText(params: RepostParams): Promise<{ eventId: string }> {
  const cleaned = cleanCrawledText(params.text);

  // Gemini 없이 저장하므로 analysis.rawText만 채워 전달
  const eventId = await saveEventToFirestore({
    sourceUrl: params.sourceUrl ?? null,
    analysis: { rawText: cleaned },
    tags: [],
    org: params.org ?? { id: "unknown", name: "Unknown", logoUrl: null, homepageUrl: null },
    posterImageUrl: params.posterImageUrl ?? null,
  });
  return { eventId };
}


