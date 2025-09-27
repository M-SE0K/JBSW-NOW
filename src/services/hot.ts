import "../db/firebase";
import { getFirestore, doc, setDoc, updateDoc, getDoc, serverTimestamp, increment, collection, query, orderBy, limit, getDocs, where, documentId } from "firebase/firestore";
import type { Event } from "../types";
import { fetchRecentNewsWithinDays, fetchRecentNewsByDateWithinDays } from "../api/eventsFirestore";

export type HotClickDoc = {
  id: string; // key
  count: number;
  title?: string | null;
  sourceUrl?: string | null;
  posterImageUrl?: string | null;
  updatedAt?: any;
};

const COL = "hotClicks";

export async function incrementHotClick(payload: { key: string; title?: string | null; sourceUrl?: string | null; posterImageUrl?: string | null; }): Promise<void> {
  const db = getFirestore();
  const key = (payload.key || "").trim();
  if (!key) return;
  const ref = doc(db, COL, key);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: key,
      count: 1,
      title: payload.title ?? null,
      sourceUrl: payload.sourceUrl ?? null,
      posterImageUrl: payload.posterImageUrl ?? null,
      updatedAt: serverTimestamp(),
    });
    console.log("[HOT] created +1", { id: key, prev: 0, next: 1 });
    return;
  }
  const prev = Number(snap.data()?.count ?? 0) || 0;
  await updateDoc(ref, {
    count: increment(1),
    title: payload.title ?? snap.data()?.title ?? null,
    sourceUrl: payload.sourceUrl ?? snap.data()?.sourceUrl ?? null,
    posterImageUrl: payload.posterImageUrl ?? snap.data()?.posterImageUrl ?? null,
    updatedAt: serverTimestamp(),
  });
  console.log("[HOT] increment", { id: key, prev, next: prev + 1 });
}

export async function fetchHotTop(maxCount: number = 20): Promise<Event[]> {
  const db = getFirestore();
  const col = collection(db, COL);
  const q = query(col, orderBy("count", "desc"), limit(maxCount));
  const snap = await getDocs(q);
  const out: Event[] = [];
  snap.forEach((docu) => {
    const d = docu.data() as any;
    out.push({
      id: `hot-${docu.id}`,
      title: d?.title || "인기 글",
      summary: null,
      startAt: new Date(d?.updatedAt?.toDate?.() || Date.now()).toISOString(),
      endAt: null,
      location: null,
      tags: ["인기"],
      org: { id: "hot", name: `조회수 ${d?.count ?? 0}`, logoUrl: null },
      sourceUrl: d?.sourceUrl ?? null,
      posterImageUrl: d?.posterImageUrl ?? null,
      ai: null,
    } as Event);
  });
  return out;
}


// 최근 N일 내 이벤트 중 hotCount(=hotClicks.count) 상위 K개 반환
export async function fetchRecentHotTopWithinDays(days: number = 30, topCount: number = 10): Promise<Event[]> {
  let recentEvents = await fetchRecentNewsWithinDays(days, Math.max(150, topCount * 10));
  if (!recentEvents.length) {
    console.warn("[HOT] no recent events by createdAt; fallback to date-string filter");
    recentEvents = await fetchRecentNewsByDateWithinDays(days, Math.max(150, topCount * 10));
  }
  if (!recentEvents.length) {
    console.warn("[HOT] no recent events by any strategy; fallback to hotClicks top");
    return await fetchHotTop(topCount);
  }
  console.log("[HOT] candidates", { days, candidates: recentEvents.length });

  const db = getFirestore();
  const col = collection(db, COL);

  // Firestore의 documentId() in 쿼리는 최대 10개까지이므로 청크로 나누어 조회
  const chunkSize = 10;
  const idToCount = new Map<string, number>();
  for (let i = 0; i < recentEvents.length; i += chunkSize) {
    const chunkIds = recentEvents.slice(i, i + chunkSize).map((e) => e.id);
    if (chunkIds.length === 0) continue;
    try {
      const snap = await getDocs(query(col, where(documentId(), "in", chunkIds)));
      snap.forEach((d) => {
        const data = d.data() as any;
        idToCount.set(d.id, Number(data?.count ?? 0) || 0);
      });
    } catch (error) {
      console.warn("[HOT] chunk query failed, fallback by getDoc loop", error);
      // 폴백: 개별 getDoc (비효율적이지만 안전)
      for (const id of chunkIds) {
        try {
          const ref = doc(db, COL, id);
          const s = await getDoc(ref);
          if (s.exists()) {
            idToCount.set(id, Number(s.data()?.count ?? 0) || 0);
          }
        } catch {}
      }
    }
  }

  // count를 부여하고 정렬
  const enriched = recentEvents.map((ev) => ({ ev, count: idToCount.get(ev.id) ?? 0 }));
  enriched.sort((a, b) => {
    const byCount = b.count - a.count;
    if (byCount !== 0) return byCount;
    // 동률일 경우 원래 리스트 순서를 유지(안정 정렬 유사 효과)
    return 0;
  });
  return enriched.slice(0, topCount).map((x) => x.ev);
}

