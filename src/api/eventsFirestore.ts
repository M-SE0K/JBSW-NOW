import "../db/firebase";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import type { Event } from "../types";
import { formatRowTextForPost, cleanCrawledText } from "../utils/textCleaner";

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

// 인기소식 검색 함수
export async function searchHotNews(searchTerm: string, maxCount: number = 20): Promise<Event[]> {
  const db = getFirestore();
  const eventsRef = collection(db, "events");
<<<<<<< HEAD
  const q = query(eventsRef, orderBy("createdAt", "desc"), limit(maxCount));
  const snap = await getDocs(q);
  const out: Event[] = [];
  snap.forEach((doc) => {
    const d = doc.data() as any;
    // Debug: raw rowText vs cleaned preview (for visual diff)
    const rawRowText: string | undefined = d?.ai?.rawText;
    if (rawRowText) {
      const { text: cleanedPreview } = formatRowTextForPost(rawRowText);
      // console.log("[DB] recentNews rowText/raw:", rawRowText.slice(0, 240));
      // console.log("[DB] recentNews rowText/cleaned:", cleanedPreview.slice(0, 240));
    }
    // 시각화용 title/summary 정리: <TEXT> 마커/불필요 태그 제거
    const cleanedTitle = typeof d.title === "string" ? cleanCrawledText(d.title, { maxLength: 300 }) : d.title;
    let cleanedSummary: string | null = d.summary ?? null;
    if (typeof cleanedSummary === "string") {
      cleanedSummary = formatRowTextForPost(cleanedSummary).text;
    }

    out.push({
      id: doc.id,
      title: cleanedTitle,
      summary: cleanedSummary,
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
=======

  // Firestore에서 제목이나 요약에 검색어가 포함된 이벤트를 가져옵니다
  const firestoreQuery = query(
    eventsRef,
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );

  try {
    const snap = await getDocs(firestoreQuery);
    const collected: Event[] = [];
    
    snap.forEach((doc) => {
      const d = doc.data() as any;
      const title = d.title?.toLowerCase() || "";
      const summary = d.summary?.toLowerCase() || "";
      const term = searchTerm.toLowerCase();
      
      // 제목이나 요약에 검색어가 포함된 경우만 필터링
      if (title.includes(term) || summary.includes(term)) {
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
      }
    });
    
    return collected;
  } catch (err) {
    console.error("[DB] searchHotNews:error", err);
    throw err;
  }
}

// 인기소식 전용 최근 검색어 관련 함수들
export async function getHotRecentSearches(): Promise<string[]> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem("hotRecentSearches");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  } catch (error) {
    console.error("인기소식 최근 검색어 로드 실패:", error);
    return [];
  }
}

export async function saveHotRecentSearch(query: string): Promise<void> {
  try {
    const recent = await getHotRecentSearches();
    const updated = [query, ...recent.filter(item => item !== query)].slice(0, 10);
    
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("hotRecentSearches", JSON.stringify(updated));
    }
  } catch (error) {
    console.error("인기소식 최근 검색어 저장 실패:", error);
  }
}

export async function clearHotRecentSearches(): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("hotRecentSearches");
    }
  } catch (error) {
    console.error("인기소식 최근 검색어 삭제 실패:", error);
  }
}

// 최근 소식(이벤트) 피드: createdAt DESC 상위 N개
export async function fetchRecentNews(maxCount: number = 5): Promise<Event[]> {
  try {
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
    
    // 항상 모의 데이터와 실제 데이터를 합쳐서 반환
    const mockData = getMockRecentNews();
    return [...mockData, ...out];
  } catch (error) {
    console.error("[DB] fetchRecentNews:error", error);
    // 오류 발생 시 모의 데이터 반환
    return getMockRecentNews();
  }
}

// 새로운 소식 모의 데이터
function getMockRecentNews(): Event[] {
  return [
    {
      id: "mock_news_1",
      title: "2024년 전북대학교 SW경진대회 개최 안내",
      summary: "전북대학교 소프트웨어공학과에서 주최하는 2024년 SW경진대회가 개최됩니다. 많은 학생들의 참여를 기다립니다.",
      startAt: "2024-10-15T09:00:00Z",
      endAt: "2024-10-15T18:00:00Z",
      location: "전북대학교 공학관 101호",
      tags: ["SW경진대회", "전북대학교", "프로그래밍"],
      org: {
        id: "org_jbnu",
        name: "전북대학교 SW사업단",
        logoUrl: null,
        homepageUrl: "https://sw.jbnu.ac.kr"
      },
      sourceUrl: null,
      posterImageUrl: null,
      ai: null,
    }
  ];
>>>>>>> main
}


