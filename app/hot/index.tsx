import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";
import { fetchRecentHotTopWithinDays, getHotClickCounts } from "../../src/services/hot";
import { fetchNoticesCleaned, type Notice } from "../../src/api/eventsFirestore";
import { normalize } from "../../src/services/search";
import { subscribe as subscribeFavorites, ensureUserId as ensureFavUser } from "../../src/services/favorites";
import { enrichEventsWithTags } from "../../src/services/tags";

export default function HotScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [favTick, setFavTick] = useState<number>(0);

  const previewItem = (e: Event) => ({
    id: e?.id,
    title: typeof e?.title === "string" ? e.title.slice(0, 80) : e?.title,
    hasSummary: typeof e?.summary === "string" && e.summary.length > 0,
    hasAiSummary: typeof e?.ai?.summary === "string" && e.ai.summary.length > 0,
    summaryPreview: typeof e?.summary === "string" ? e.summary.slice(0, 160) : null,
    aiSummaryPreview: typeof e?.ai?.summary === "string" ? e.ai.summary.slice(0, 160) : null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 병렬 처리: hot 게시물과 notices를 동시에 가져오기
      const [top10Raw, notices] = await Promise.all([
        fetchRecentHotTopWithinDays(30, 10),
        fetchNoticesCleaned(200),
      ]);
      
      console.log("[HOT] load: fetched recent hot raw", {
        count: top10Raw.length,
        sample: top10Raw.slice(0, 3).map(previewItem),
      });

      // notices를 Map으로 변환 (빠른 조회를 위해)
      const byUrl = new Map<string, Notice>();
      (notices || []).forEach((n) => {
        const url = (n.url || "").trim();
        if (url) byUrl.set(url, n);
      });
      
      const findNoticeFor = (title?: string | null, url?: string | null): Notice | undefined => {
        const u = (url || "").trim();
        if (u && byUrl.has(u)) return byUrl.get(u);
        const t = normalize(title || "");
        if (!t) return undefined;
        return (notices || []).find((n) => {
          const nt = normalize(n.title || "");
          return nt && (nt === t || nt.includes(t) || t.includes(nt));
        });
      };

      // summary 보강 (태그 enrich는 성능상 제외)
      const withSummary = (top10Raw as any[]).map((e: any) => {
        if (typeof e?.summary === "string" && e.summary.trim()) return e;
        const matched = findNoticeFor(e?.title, e?.sourceUrl);
        const fromContent = matched?.content ? String(matched.content).slice(0, 200) : null;
        return fromContent ? { ...e, summary: fromContent } : e;
      });
      
      console.log("[HOT] load: after notice-merge", withSummary.slice(0, 3).map(previewItem as any));
      setEvents(withSummary as any);
    } catch (e) {
      console.error("[HOT] load error", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 병렬 처리로 성능 개선
      const [top10Raw, notices] = await Promise.all([
        fetchRecentHotTopWithinDays(30, 10),
        fetchNoticesCleaned(200),
      ]);
      
      console.log("[HOT] refresh: fetched recent hot raw", {
        count: top10Raw.length,
        sample: top10Raw.slice(0, 3).map(previewItem),
      });

      const byUrl = new Map<string, Notice>();
      (notices || []).forEach((n) => {
        const url = (n.url || "").trim();
        if (url) byUrl.set(url, n);
      });
      
      const findNoticeFor = (title?: string | null, url?: string | null): Notice | undefined => {
        const u = (url || "").trim();
        if (u && byUrl.has(u)) return byUrl.get(u);
        const t = normalize(title || "");
        if (!t) return undefined;
        return (notices || []).find((n) => {
          const nt = normalize(n.title || "");
          return nt && (nt === t || nt.includes(t) || t.includes(nt));
        });
      };
      
      const withSummary = (top10Raw as any[]).map((e: any) => {
        if (typeof e?.summary === "string" && e.summary.trim()) return e;
        const matched = findNoticeFor(e?.title, e?.sourceUrl);
        const fromContent = matched?.content ? String(matched.content).slice(0, 200) : null;
        return fromContent ? { ...e, summary: fromContent } : e;
      });
      
      console.log("[HOT] refresh: after notice-merge", withSummary.slice(0, 3).map(previewItem as any));
      setEvents(withSummary as any);
    } catch (e) {
      console.error("[HOT] refresh error", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 상태 변경 시 프리뷰 로그
  useEffect(() => {
    if (!events) return;
    const preview = (events || []).slice(0, 5).map(previewItem);
    console.log("[HOT] state: events updated", { count: events.length, preview });
  }, [events]);

  useEffect(() => {
    ensureFavUser();
    const unsub = subscribeFavorites(() => setFavTick((v) => v + 1));
    return () => unsub();
  }, []);

  // 실시간 조회수 업데이트 (5초마다 - 더 빠른 반영)
  useEffect(() => {
    if (events.length === 0) return;
    
    const updateClickCounts = async () => {
      try {
        const eventIds = events.map((e) => e.id);
        const counts = await getHotClickCounts(eventIds);
        
        setEvents((prevEvents) =>
          prevEvents.map((ev) => {
            const count = counts.get(ev.id);
            // 조회수가 있으면 업데이트 (0도 포함)
            if (count !== undefined) {
              return { ...ev, hotClickCount: count };
            }
            return ev;
          })
        );
      } catch (error) {
        console.warn("[HOT] failed to update click counts", error);
      }
    };

    // 초기 업데이트
    updateClickCounts();
    
    // 5초마다 업데이트 (더 빠른 반영)
    const interval = setInterval(updateClickCounts, 30000);
    
    return () => clearInterval(interval);
  }, [events.length]);

  // 페이지 포커스 시 조회수 갱신
  useFocusEffect(
    useCallback(() => {
      if (events.length === 0) return;
      
      const updateClickCounts = async () => {
        try {
          const eventIds = events.map((e) => e.id);
          const counts = await getHotClickCounts(eventIds);
          
          setEvents((prevEvents) =>
            prevEvents.map((ev) => {
              const count = counts.get(ev.id);
              if (count !== undefined) {
                return { ...ev, hotClickCount: count };
              }
              return ev;
            })
          );
        } catch (error) {
          console.warn("[HOT] failed to update click counts on focus", error);
        }
      };

      updateClickCounts();
    }, [events.length])
  );

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

