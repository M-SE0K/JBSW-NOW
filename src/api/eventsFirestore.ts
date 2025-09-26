import "../db/firebase";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import type { Event } from "../types";

/**
 * Firestore에서 최근 14일 이내 생성된 이벤트 중 포스터 이미지가 있는 문서를 가져옵니다.
 * - 입력: 최대 건수(maxCount)
 * - 필터: createdAt >= (현재 - 14일), posterImageUrl 존재
 * - 정렬: createdAt DESC
 *
 * 주의(파이어스토어 제약):
 * - 범위 필터(<, <=, >, >=, !=, not-in)는 단일 필드에만 허용됩니다.
 *   본 쿼리는 createdAt(>=)과 posterImageUrl(!=) 두 필드에 범위 필터가 있어
 *   프로젝트/인덱스와 환경에 따라 에러가 발생할 수 있습니다.
 *   문제가 된다면 posterImageUrl 필터를 exists 체크 방식(예: '>' "")으로 바꾸거나,
 *   데이터 모델을 변경(저장 시 flag 필드 추가)하는 방식을 고려하세요.
 */

// 최근 14일 이내에 생성된 문서 중 포스터 이미지가 있는 항목을 가져옵니다.
export async function fetchRecentPosterEvents(maxCount: number = 10): Promise<Event[]> {
  const db = getFirestore();
  const eventsRef = collection(db, "events");

  // 기준 시점 계산: 현재 시각과 14일 전 Timestamp
  const now = Timestamp.now();
  const fourteenDaysAgo = Timestamp.fromMillis(now.toMillis() - 14 * 24 * 60 * 60 * 1000);

  // Firestore 제약으로 하나의 쿼리에서 여러 필드에 부등호/범위 필터를 함께 사용할 수 없습니다.
  // createdAt 범위 필터만 사용하고, posterImageUrl 존재 여부는 클라이언트에서 후처리합니다.
  // 충분한 수집을 위해 쿼리 limit을 여유 있게 늘린 뒤(slice) 반환합니다.
  const q = query(
    eventsRef,
    where("createdAt", ">=", fourteenDaysAgo),
    orderBy("createdAt", "desc"),
    limit(Math.max(20, maxCount * 3))
  );

  // 디버그: 쿼리 조건 로그
  console.log("[DB] fetchRecentPosterEvents:start", {
    maxCount,
    sinceISO: fourteenDaysAgo.toDate().toISOString(),
    nowISO: now.toDate().toISOString(),
  });

  try {
    const snap = await getDocs(q);
    console.log("[DB] fetchRecentPosterEvents:snapshot", { count: snap.size });

    const collected: Event[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;
      // 간단한 문서 단위 로그
      console.log("[DB] fetchRecentPosterEvents:doc", {
        id: doc.id,
        posterImageUrl: d?.posterImageUrl ?? null,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() ?? d?.createdAt ?? null,
      });
      // 필요한 필드만 추출하고 기본값을 보강합니다.
      collected.push({
        id: doc.id,
        title: d.title,
        summary: d.summary ?? null,
        startAt: d.startAt ?? null,
        endAt: d.endAt ?? null,
        location: d.location ?? null,
        tags: d.tags ?? [],
        org: d.org,
        sourceUrl: d.sourceUrl ?? null,
        posterImageUrl: d.posterImageUrl ?? null,
        ai: d.ai ?? null,
      } as Event);
    });
    // posterImageUrl이 존재하는 문서만 필터링 후 상한(maxCount)으로 자릅니다.
    const out = collected.filter((e) => !!e.posterImageUrl && String(e.posterImageUrl).trim() !== "").slice(0, maxCount);
    console.log("[DB] fetchRecentPosterEvents:filtered", { filteredCount: out.length });
    return out;
  } catch (err) {
    console.error("[DB] fetchRecentPosterEvents:error", err);
    throw err;
  }
}

// 최근 소식(이벤트) 피드: createdAt DESC 상위 N개
export async function fetchRecentNews(maxCount: number = 20): Promise<Event[]> {
  const db = getFirestore();
  const eventsRef = collection(db, "events");
  const q = query(eventsRef, orderBy("createdAt", "desc"), limit(maxCount));
  const snap = await getDocs(q);
  const out: Event[] = [];
  snap.forEach((doc) => {
    const d = doc.data() as any;
    out.push({
      id: doc.id,
      title: d.title,
      summary: d.summary ?? null,
      startAt: d.startAt ?? null,
      endAt: d.endAt ?? null,
      location: d.location ?? null,
      tags: d.tags ?? [],
      org: d.org,
      sourceUrl: d.sourceUrl ?? null,
      posterImageUrl: d.posterImageUrl ?? null,
      ai: d.ai ?? null,
    } as Event);
  });
  return out;
}


