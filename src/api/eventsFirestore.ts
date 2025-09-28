import "../db/firebase";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import type { Event } from "../types";
import { formatRowTextForPost, cleanCrawledText } from "../utils/textCleaner";

/**
 * Firestore에서 최근 14일 이내 생성된 이벤트 중 포스터 이미지가 있는 문서를 가져옵니다.
 * - 입력: 최대 건수(maxCount)
 * - 필터: date >= (현재 - 14일), posterImageUrl 존재
 * - 정렬: date DESC
 *
 * 주의(파이어스토어 제약):
 * - 범위 필터(<, <=, >, >=, !=, not-in)는 단일 필드에만 허용됩니다.
 *   본 쿼리는 date(>=)과 posterImageUrl(!=) 두 필드에 범위 필터가 있어
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
  // date 범위 필터만 사용하고, posterImageUrl 존재 여부는 클라이언트에서 후처리합니다.
  // 충분한 수집을 위해 쿼리 limit을 여유 있게 늘린 뒤(slice) 반환합니다.
  const q = query(
    eventsRef,
    where("date", ">=", fourteenDaysAgo),
    orderBy("date", "desc"),
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
        date: d?.date?.toDate?.()?.toISOString?.() ?? d?.date ?? null,
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

// 알림(notification) 컬렉션에서 배너로 사용할 이미지가 포함된 항목을 조회
// 다양한 필드명을 허용: imageUrl | image_url | image | bannerImageUrl | image_urls[0]
export async function fetchRecentNotificationBanners(maxCount: number = 10): Promise<Event[]> {
  const db = getFirestore();
  const ref = collection(db, "notifications");
  // createdAt 기준 최근 순, 실패 시 정렬 없이 제한만 적용
  let snap;
  try {
    snap = await getDocs(query(ref, orderBy("date", "desc"), limit(maxCount * 3)));
  } catch (_) {
    snap = await getDocs(query(ref, limit(maxCount * 3)));
  }

  const out: Event[] = [];
  snap.forEach((doc: { id: string; data: () => any }) => {
    const d = doc.data() as any;
    const candidates: Array<string | null | undefined> = [
      d?.imageUrl,
      d?.image_url,
      d?.image,
      d?.bannerImageUrl,
      Array.isArray(d?.image_urls) ? d.image_urls[0] : undefined,
    ];
    const image = candidates.find((u) => typeof u === "string" && String(u).trim() !== "");
    if (!image) return;

    // 최소 필드만 채운 Event 형태로 변환
    out.push({
      id: `notif-${doc.id}`,
      title: d?.title || "",
      summary: d?.body || d?.content || null,
      startAt: d?.date?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      endAt: null,
      location: null,
      tags: ["알림"],
      org: { id: "notification", name: d?.sender || "알림", logoUrl: null },
      sourceUrl: d?.url || d?.link || null,
      posterImageUrl: image,
      ai: null,
    } as Event);
  });

  // 상한 제한
  return out.slice(0, maxCount);
}

// notices 컬렉션에서 배너로 사용할 이미지 추출
// 우선순위: image_urls[0] -> content_html 내 <img src> 첫 번째 -> content 내 확장자 기반 URL
export async function fetchRecentNoticeBanners(maxCount: number = 10): Promise<Event[]> {
  const db = getFirestore();
  const ref = collection(db, "notices");
  let snap;
  try {
    snap = await getDocs(query(ref, orderBy("dateSort", "desc"), limit(maxCount * 3)));
  } catch (_) {
    try {
      snap = await getDocs(query(ref, orderBy("date", "desc"), limit(maxCount * 3)));
    } catch {
      try {
        snap = await getDocs(query(ref, orderBy("firebase_created_at", "desc"), limit(maxCount * 3)));
      } catch {
        snap = await getDocs(query(ref, limit(maxCount * 3)));
      }
    }
  }
  // createdAt 정렬이 비어있는 경우에도 폴백 수행
  if (snap.empty) {
    try {
      const fbSnap = await getDocs(query(ref, orderBy("date", "desc"), limit(maxCount * 3)));
      if (!fbSnap.empty) {
        snap = fbSnap;
      } else {
        try {
          const fb2 = await getDocs(query(ref, orderBy("firebase_date", "desc"), limit(maxCount * 3)));
          snap = fb2;
        } catch (_) {
          const plain = await getDocs(query(ref, limit(maxCount * 3)));
          snap = plain;
        }
      }
    } catch (_) {
      const plain = await getDocs(query(ref, limit(maxCount * 3)));
      snap = plain;
    }
  }

  const out: Event[] = [];
  console.log("[DB] fetchRecentNoticeBanners:snapshot", { count: snap.size });
  snap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
    const d = doc.data() as any;
    const title: string = d?.title || "";
    const url: string | null = d?.url || null;
    const author: string | null = d?.author || null;

    // 1) image_urls[0]
    let image: string | undefined;
    if (Array.isArray(d?.image_urls) && d.image_urls.length > 0) {
      image = d.image_urls[0];
    }

    // 2) content_html의 첫 <img src>
    if (!image && typeof d?.content_html === "string") {
      const m = d.content_html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m && m[1]) image = m[1];
    }

    // 3) content의 URL 추출(간단한 확장자 기반)
    if (!image && typeof d?.content === "string") {
      const m = d.content.match(/https?:[^\s"')]+\.(?:png|jpe?g|gif|webp)/i);
      if (m && m[0]) image = m[0];
    }

    //console.log("[DB] fetchRecentNoticeBanners:doc", { id: doc.id, hasImage: !!image, title: title?.slice?.(0, 60) });
    if (!image) return;

    out.push({
      id: `notice-${doc.id}`,
      title,
      summary: null,
      startAt: d?.date?.toDate?.()?.toISOString?.() || d?.firebase_date || new Date().toISOString(),
      endAt: null,
      location: null,
      tags: ["공지"],
      org: { id: "notice", name: author || "공지", logoUrl: null },
      sourceUrl: url,
      posterImageUrl: image,
      ai: null,
    } as Event);
  });

  const sliced = out.slice(0, maxCount);
  //console.log("[DB] fetchRecentNoticeBanners:out", { count: sliced.length });
  return sliced;
}

// 인기소식 검색 함수
export async function searchHotNews(searchTerm: string, maxCount: number = 20): Promise<Event[]> {
  const db = getFirestore();
  const eventsRef = collection(db, "events");
  const q = query(eventsRef, orderBy("date", "desc"), limit(maxCount));
  const snap = await getDocs(q);
  const out: Event[] = [];
  snap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
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

  // Firestore에서 제목이나 요약에 검색어가 포함된 이벤트를 가져옵니다
  const firestoreQuery = query(
    eventsRef,
    orderBy("date", "desc"),
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
    const q = query(eventsRef, orderBy("date", "desc"), limit(maxCount));
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
    
    // 실제 데이터만 반환 (모의 데이터 제거)
    return out;
  } catch (error) {
    console.error("[DB] fetchRecentNews:error", error);
    // 오류 발생 시 빈 배열 반환
    return [];
  }
}

// 최근 N일 이내 createdAt 기준으로 최신 소식 조회
export async function fetchRecentNewsWithinDays(days: number = 30, maxCount: number = 50): Promise<Event[]> {
  try {
    const db = getFirestore();
    const eventsRef = collection(db, "events");
    const now = Timestamp.now();
    const cutoff = Timestamp.fromMillis(now.toMillis() - days * 24 * 60 * 60 * 1000);
    const qy = query(eventsRef, where("date", ">=", cutoff), orderBy("date", "desc"), limit(Math.max(maxCount, 50)));
    const snap = await getDocs(qy);
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
  } catch (error) {
    console.error("[DB] fetchRecentNewsWithinDays:error", error);
    return [];
  }
}

// startAt(또는 endAt) "날짜 문자열"을 기준으로 최근 N일 내 이벤트를 가져옵니다(클라이언트 필터).
export async function fetchRecentNewsByDateWithinDays(days: number = 30, maxCount: number = 100): Promise<Event[]> {
  try {
    const db = getFirestore();
    const eventsRef = collection(db, "events");
    // 충분한 수집: date DESC로 넉넉히 가져온 후 날짜 문자열(startAt/endAt)로 필터
    const snap = await getDocs(query(eventsRef, orderBy("date", "desc"), limit(Math.max(maxCount * 3, 150))));
    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const out: Event[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;
      const startStr: string | null = d?.startAt ?? null;
      const endStr: string | null = d?.endAt ?? null;
      const targetStr = startStr || endStr;
      const ms = parseDateMsFromString(targetStr);
      if (ms && ms >= cutoffMs) {
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
      }
    });
    return out;
  } catch (error) {
    console.error("[DB] fetchRecentNewsByDateWithinDays:error", error);
    return [];
  }
}

function parseDateMsFromString(s?: string | null): number | null {
  if (!s || typeof s !== "string") return null;
  // YYYY-MM-DD 또는 ISO
  const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, Math.max(0, mo - 1), d, 0, 0, 0);
    return dt.getTime();
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

// 새로운 소식 모의 데이터
function getMockRecentNews(): Event[] {
  return [
    // {
    //   id: "",
    //   title: "",
    //   startAt: "",
    //   org: {
    //     id: "",
    //     name: "",
    //     logoUrl: null,
    //     homepageUrl: undefined
    //   }
    // }
  ];
}


// notices 컬렉션: 원문(title/content) 정제 전/후 로그와 함께 정제 결과 반환
export type Notice = {
  id: string;
  title: string; // 정제된 제목
  content: string; // 정제된 본문(plain text)
  url?: string | null; // 원문 URL
  author?: string | null;
  category?: string | null;
  date?: string | null;
  crawled_at?: string | null;
  firebase_created_at?: string | null;
  firebase_updated_at?: string | null;
  image_urls?: string[] | null;
  attachments?: string | null; // 예: "3"
  views?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

export async function fetchNoticesCleaned(maxCount: number = 20): Promise<Notice[]> {
  const db = getFirestore();
  const ref = collection(db, "notices");

  // 0차: date(문자열) 기준 정렬 시도
  let snap: any;
  try {
    snap = await getDocs(query(ref, orderBy("date", "desc"), limit(maxCount)));
  } catch (_) {
    // 1차: dateSort(Timestamp/number) 기준 정렬 시도
    try {
      snap = await getDocs(query(ref, orderBy("dateSort", "desc"), limit(maxCount)));
    } catch {
      // 2차: createdAt(Timestamp) 기준 정렬 시도
      snap = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(maxCount)));
    }
  }
  if (snap.empty) {
    // 3차: firebase_created_at(ISO 문자열) 기준 정렬 시도
    try {
      snap = await getDocs(query(ref, orderBy("firebase_created_at", "desc"), limit(maxCount)));
      if (snap.empty) {
        // 4차: 정렬 없이 제한만
        snap = await getDocs(query(ref, limit(maxCount)));
      }
    } catch (_) {
      // 필드 미존재 등으로 실패 시, 정렬 없이 재시도
      snap = await getDocs(query(ref, limit(maxCount)));
    }
  }
  const out: Notice[] = [];
  for (const doc of snap.docs as unknown as Array<QueryDocumentSnapshot<DocumentData>>) {
    const d = doc.data() as any;
    const rawTitle: string = d?.title ?? "";
    const rawContentHtml: string = d?.content_html ?? "";
    const rawContentText: string = d?.content ?? "";
    const rawContent: string = rawContentHtml || rawContentText;

    // 정제: 스크립트/스타일/불필요 태그 제거 + 엔티티 디코드
    const cleanedTitle = cleanCrawledText(rawTitle, { maxLength: 300 });
    const cleanedContent = (() => {
      if (/<TEXT>|<JSON>/i.test(rawContent)) {
        const { text } = formatRowTextForPost(rawContent);
        return cleanCrawledText(text, { maxLength: 10000 });
      }
      return cleanCrawledText(rawContent, { maxLength: 10000 });
    })();

    // 로그: 정제 전/후 프리뷰(200자)
    // console.log("[NOTICE] raw.title:", String(rawTitle).slice(0, 200));
    // console.log("[NOTICE] raw.content:", String(rawContent).slice(0, 200));
    // console.log("[NOTICE] cleaned.title:", cleanedTitle.slice(0, 200));
    // console.log("[NOTICE] cleaned.content:", cleanedContent.slice(0, 200));

    out.push({
      id: doc.id,
      title: cleanedTitle,
      content: cleanedContent,
      url: d?.url ?? null,
      author: d?.author ?? null,
      category: d?.category ?? null,
      date: d?.date ?? null,
      crawled_at: d?.crawled_at ?? null,
      firebase_created_at: d?.firebase_created_at ?? null,
      firebase_updated_at: d?.firebase_updated_at ?? null,
      image_urls: Array.isArray(d?.image_urls) ? d.image_urls : null,
      attachments: d?.attachments ?? null,
      views: d?.views ?? null,
      createdAt: d?.createdAt ?? null,
      updatedAt: d?.updatedAt ?? null,
    });
  }
  return out;
}

// 샘플: 15건만 조회해 정제 및 로그 출력
export async function fetchNoticesSample(): Promise<Notice[]> {
  return fetchNoticesCleaned(15);
}


