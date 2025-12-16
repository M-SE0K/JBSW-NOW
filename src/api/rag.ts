/**
 * RAG (Retrieval-Augmented Generation) 시스템
 * Firebase에서 관련 문서를 검색하여 LLM 컨텍스트로 제공
 */

import { fetchNoticesCleaned, type Notice } from "./eventsFirestore";
import { fetchRecentNews, type Event } from "./eventsFirestore";

export type RetrievedDocument = {
  id: string;
  title: string;
  content: string;
  source: "notice" | "event";
  url?: string | null;
  date?: string | null;
};

/**
 * 키워드 기반 문서 검색 (간단한 구현)
 * 나중에 벡터 검색으로 업그레이드 가능
 */
function searchDocuments(
  query: string,
  notices: Notice[],
  events: Event[],
  maxResults: number = 5
): RetrievedDocument[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 1);

  const results: RetrievedDocument[] = [];

  // 공지사항 검색
  for (const notice of notices) {
    const titleLower = notice.title.toLowerCase();
    const contentLower = notice.content.toLowerCase();

    // 제목 매칭 점수
    let score = 0;
    for (const word of queryWords) {
      if (titleLower.includes(word)) score += 3; // 제목 매칭은 높은 점수
      if (contentLower.includes(word)) score += 1; // 내용 매칭은 낮은 점수
    }

    if (score > 0) {
      results.push({
        id: notice.id,
        title: notice.title,
        content: notice.content.slice(0, 500), // 최대 500자
        source: "notice",
        url: notice.url || null,
        date: notice.date || notice.firebase_created_at || null,
        score, // 내부 정렬용
      } as RetrievedDocument & { score: number });
    }
  }

  // 이벤트 검색
  for (const event of events) {
    const titleLower = event.title.toLowerCase();
    const summaryLower = (event.summary || "").toLowerCase();

    let score = 0;
    for (const word of queryWords) {
      if (titleLower.includes(word)) score += 3;
      if (summaryLower.includes(word)) score += 1;
    }

    if (score > 0) {
      results.push({
        id: event.id,
        title: event.title,
        content: event.summary || event.title,
        source: "event",
        url: event.sourceUrl || null,
        date: event.startAt || null,
        score,
      } as RetrievedDocument & { score: number });
    }
  }

  // 점수 순으로 정렬하고 상위 N개 반환
  return (results as Array<RetrievedDocument & { score: number }>)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ score, ...doc }) => doc);
}

/**
 * RAG 컨텍스트 생성
 * 검색된 문서들을 LLM 프롬프트에 포함할 형식으로 변환
 */
export function formatRAGContext(docs: RetrievedDocument[]): string {
  if (docs.length === 0) {
    return "관련 정보를 찾을 수 없습니다.";
  }

  const sections = docs.map((doc, idx) => {
    const sourceLabel = doc.source === "notice" ? "공지사항" : "이벤트";
    const dateInfo = doc.date ? ` (${doc.date})` : "";
    return `[${idx + 1}] ${sourceLabel}: ${doc.title}${dateInfo}\n내용: ${doc.content}`;
  });

  return `다음은 관련 정보입니다:\n\n${sections.join("\n\n")}`;
}

/**
 * RAG 검색 실행
 */
export async function retrieveRelevantDocuments(
  query: string,
  maxResults: number = 5
): Promise<RetrievedDocument[]> {
  try {
    // Firebase에서 최근 공지사항과 이벤트 가져오기
    const [notices, events] = await Promise.all([
      fetchNoticesCleaned(100), // 최근 100개 공지
      fetchRecentNews(100), // 최근 100개 이벤트
    ]);

    // 검색 실행
    const results = searchDocuments(query, notices, events, maxResults);

    return results;
  } catch (error) {
    console.error("[RAG] 검색 오류:", error);
    return [];
  }
}

/**
 * 검색 결과에서 citations URL 추출
 */
export function extractCitations(docs: RetrievedDocument[]): string[] {
  return docs
    .map((doc) => doc.url)
    .filter((url): url is string => url !== null && url !== undefined && url.trim() !== "");
}

