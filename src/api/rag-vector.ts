/**
 * 벡터 임베딩 기반 RAG 검색 시스템
 * 
 * 사용 방법:
 * 1. 먼저 문서 임베딩을 생성하고 Firestore에 저장 (scripts/generate-embeddings.mjs 실행)
 * 2. retrieveRelevantDocumentsVector 함수를 사용하여 벡터 검색 수행
 */

import "../db/firebase";
import { getFirestore, collection, query, limit, getDocs, where, orderBy } from "firebase/firestore";
import { fetchNoticesCleaned, type Notice } from "./eventsFirestore";
import { fetchRecentNews } from "./eventsFirestore";
import type { Event } from "../types";
import { generateEmbedding, cosineSimilarity } from "./gemini/embeddings";

export type RetrievedDocument = {
  id: string;
  title: string;
  content: string;
  source: "notice" | "event";
  url?: string | null;
  date?: string | null;
  similarity?: number; // 벡터 유사도 점수
};

/**
 * 문서를 검색 가능한 텍스트로 변환
 */
function documentToSearchableText(doc: Notice | Event, type: "notice" | "event"): string {
  if (type === "notice") {
    const notice = doc as Notice;
    return `${notice.title}\n${notice.content || ""}`.trim();
  } else {
    const event = doc as Event;
    return `${event.title}\n${event.summary || ""}`.trim();
  }
}

/**
 * 벡터 임베딩 기반 문서 검색
 */
export async function retrieveRelevantDocumentsVector(
  queryText: string,
  maxResults: number = 5
): Promise<RetrievedDocument[]> {
  try {
    // 1. 쿼리 임베딩 생성
    console.log("[RAG-Vector] Generating query embedding...");
    const queryEmbedding = await generateEmbedding(queryText);

    // 2. Firestore에서 최근 문서 가져오기
    const [notices, events] = await Promise.all([
      fetchNoticesCleaned(200), // 최근 200개 공지
      fetchRecentNews(200), // 최근 200개 이벤트
    ]);

    console.log("[RAG-Vector] Fetched documents", { notices: notices.length, events: events.length });

    // 3. Firestore에서 임베딩 가져오기
    const db = getFirestore();
    const results: Array<RetrievedDocument & { similarity: number; embedding?: number[] }> = [];

    // 공지사항 임베딩 검색
    for (const notice of notices) {
      try {
        const noticeRef = collection(db, "notices");
        const noticeDoc = await getDocs(query(noticeRef, where("__name__", "==", notice.id), limit(1)));
        
        if (!noticeDoc.empty) {
          const data = noticeDoc.docs[0].data();
          const embedding = data.embedding as number[] | undefined;

          if (embedding && Array.isArray(embedding)) {
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            const searchableText = documentToSearchableText(notice, "notice");

            results.push({
              id: notice.id,
              title: notice.title,
              content: notice.content?.slice(0, 500) || "",
              source: "notice",
              url: notice.url || null,
              date: notice.date || notice.firebase_created_at || null,
              similarity,
              embedding,
            });
          }
        }
      } catch (error) {
        console.warn("[RAG-Vector] Failed to get embedding for notice", notice.id, error);
      }
    }

    // 이벤트 임베딩 검색
    for (const event of events) {
      try {
        const eventRef = collection(db, "events");
        const eventDoc = await getDocs(query(eventRef, where("__name__", "==", event.id), limit(1)));

        if (!eventDoc.empty) {
          const data = eventDoc.docs[0].data();
          const embedding = data.embedding as number[] | undefined;

          if (embedding && Array.isArray(embedding)) {
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            const searchableText = documentToSearchableText(event, "event");

            results.push({
              id: event.id,
              title: event.title,
              content: event.summary || event.title,
              source: "event",
              url: event.sourceUrl || null,
              date: event.startAt || null,
              similarity,
              embedding,
            });
          }
        }
      } catch (error) {
        console.warn("[RAG-Vector] Failed to get embedding for event", event.id, error);
      }
    }

    // 4. 유사도 순으로 정렬하고 상위 N개 반환
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, maxResults);

    console.log("[RAG-Vector] Search completed", {
      total: results.length,
      returned: topResults.length,
      topSimilarities: topResults.map((r) => r.similarity),
    });

    return topResults.map(({ embedding, ...doc }) => doc);
  } catch (error) {
    console.error("[RAG-Vector] Search error:", error);
    return [];
  }
}

/**
 * 하이브리드 검색: 벡터 검색 + 키워드 검색 결합
 */
export async function retrieveRelevantDocumentsHybrid(
  queryText: string,
  maxResults: number = 5,
  vectorWeight: number = 0.7 // 벡터 검색 가중치 (0.7 = 70%)
): Promise<RetrievedDocument[]> {
  // 벡터 검색과 키워드 검색을 병렬로 수행
  const [vectorResults, keywordResults] = await Promise.allSettled([
    retrieveRelevantDocumentsVector(queryText, maxResults * 2),
    // 키워드 검색은 기존 rag.ts의 searchDocuments 함수 사용
    // (여기서는 간단히 구현)
    Promise.resolve([] as RetrievedDocument[]),
  ]);

  // 결과 통합 및 리랭킹
  // TODO: 벡터 점수와 키워드 점수를 가중 평균하여 최종 점수 계산

  if (vectorResults.status === "fulfilled") {
    return vectorResults.value.slice(0, maxResults);
  }

  return [];
}

