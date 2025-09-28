import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";
import { fetchRecentHotTopWithinDays, fetchHotTop } from "../../src/services/hot";
import { fetchRecentNews, fetchNoticesCleaned } from "../../src/api/eventsFirestore";
import { subscribe as subscribeFavorites, ensureUserId as ensureFavUser } from "../../src/services/favorites";
import { enrichEventsWithTags } from "../../src/services/tags";

export default function HotScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [favTick, setFavTick] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 홈화면과 동일한 데이터 로딩 방식 사용
      const eventsData = await fetchRecentNews(1000);
      const notices = await fetchNoticesCleaned(100); // notices 개수를 늘려서 모든 화면과 동일하게
      
      // notices를 Event 형태로 변환
      const noticeAsEvents = (notices || []).map((n: any) => ({
        id: `notice-${n.id}`,
        title: n.title,
        summary: n.content ? String(n.content).slice(0, 200) : null,
        startAt: deriveIsoDate(n.date || n.crawled_at || n.firebase_created_at),
        endAt: null,
        location: null,
        tags: [],
        org: { id: "notice", name: n.author || "공지", logoUrl: null },
        sourceUrl: n.url || null,
        posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
        ai: null,
      } as Event));

      // events와 notices를 합쳐서 홈화면과 동일한 데이터 구성
      const merged = [...noticeAsEvents, ...eventsData];
      const enriched = await enrichEventsWithTags(merged as any);
      
      // 조회수 기준으로 정렬
      const sortedByViewCount = await sortByViewCount(enriched);
      
      // 인기글은 상위 10개만 표시
      setEvents(sortedByViewCount.slice(0, 10));
    } catch (e) {
      //console.error("[HOT] load error", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 홈화면과 동일한 데이터 로딩 방식 사용
      const eventsData = await fetchRecentNews(1000);
      const notices = await fetchNoticesCleaned(100); // notices 개수를 늘려서 모든 화면과 동일하게
      
      // notices를 Event 형태로 변환
      const noticeAsEvents = (notices || []).map((n: any) => ({
        id: `notice-${n.id}`,
        title: n.title,
        summary: n.content ? String(n.content).slice(0, 200) : null,
        startAt: deriveIsoDate(n.date || n.crawled_at || n.firebase_created_at),
        endAt: null,
        location: null,
        tags: [],
        org: { id: "notice", name: n.author || "공지", logoUrl: null },
        sourceUrl: n.url || null,
        posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
        ai: null,
      } as Event));

      // events와 notices를 합쳐서 홈화면과 동일한 데이터 구성
      const merged = [...noticeAsEvents, ...eventsData];
      const enriched = await enrichEventsWithTags(merged as any);
      
      // 조회수 기준으로 정렬
      const sortedByViewCount = await sortByViewCount(enriched);
      
      // 인기글은 상위 10개만 표시
      setEvents(sortedByViewCount.slice(0, 10));
    } catch (e) {
      //console.error("[HOT] refresh error", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    ensureFavUser();
    const unsub = subscribeFavorites(() => setFavTick((v) => v + 1));
    return () => unsub();
  }, []);

  // 다양한 날짜 문자열을 ISO로 정규화
  function deriveIsoDate(input?: string | null): string {
    if (!input || typeof input !== "string") return new Date().toISOString();
    const s = input.trim();
    // 이미 ISO인 경우
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).toISOString();
    // 2025.07.30 또는 2025. 7. 30. (월) 형태를 포착
    const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(Date.UTC(y, Math.max(0, mo - 1), d, 0, 0, 0));
      return dt.toISOString();
    }
    // 그 외 문자열은 Date 파서에 위임(실패 시 현재 시각)
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
    return new Date().toISOString();
  }

  // 조회수 기준으로 정렬하고 조회수 정보를 포함하는 함수
  async function sortByViewCount(events: Event[]): Promise<Event[]> {
    try {
      // Firestore에서 직접 조회수 데이터 가져오기
      const { getFirestore, collection, getDocs, query, where, documentId } = await import("firebase/firestore");
      const db = getFirestore();
      const col = collection(db, "hotClicks");
      
      const viewCountMap = new Map<string, number>();
      
      // events의 ID들을 10개씩 청크로 나누어 조회수 데이터 가져오기
      const chunkSize = 10;
      const eventIds = events.map(e => e.id);
      
      for (let i = 0; i < eventIds.length; i += chunkSize) {
        const chunkIds = eventIds.slice(i, i + chunkSize);
        if (chunkIds.length === 0) continue;
        
        try {
          const snap = await getDocs(query(col, where(documentId(), "in", chunkIds)));
          snap.forEach((doc) => {
            const data = doc.data() as any;
            viewCountMap.set(doc.id, Number(data?.count ?? 0) || 0);
          });
        } catch (error) {
          console.warn("[HOT] chunk query failed", error);
        }
      }
      
      // 조회수 기준으로 정렬하고 조회수 정보를 org.name에 포함
      return events.sort((a, b) => {
        const viewCountA = viewCountMap.get(a.id) || 0;
        const viewCountB = viewCountMap.get(b.id) || 0;
        return viewCountB - viewCountA;
      }).map(event => ({
        ...event,
        org: {
          ...event.org,
          name: `조회수 ${viewCountMap.get(event.id) || 0}`
        }
      }));
    } catch (e) {
      console.warn("[HOT] sortByViewCount error", e);
      // 에러 시 원본 순서 유지
      return events;
    }
  }

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>불러오는 중...</Text>
          </View>
        ) : (
          <EventsList
            events={events}
            placeholderColor="#f5f5f5"
            emptyText="최근 30일 내 인기 소식이 없습니다"
            onPressItem={(ev) => {
              console.log("[UI] hot item press", ev.id);
            }}
            style={{ paddingTop: 0 }}
            ListHeaderComponent={<SectionHeader title="실시간 인기 소식" showMore={false} style={{ marginTop: 0 }} />}
            refreshing={refreshing}
            onRefresh={onRefresh}
            extraData={favTick}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#666",
  },
});

