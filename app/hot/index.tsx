import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";
import { fetchRecentHotTopWithinDays } from "../../src/services/hot";
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
      const top10Raw = await fetchRecentHotTopWithinDays(30, 10);
      console.log("[HOT] load: fetched recent hot raw", {
        count: top10Raw.length,
        sample: top10Raw.slice(0, 3).map(previewItem),
      });
      const top10 = await enrichEventsWithTags(top10Raw as any);
      console.log("[HOT] load: enriched with tags", {
        count: top10.length,
        sample: (top10 as any[]).slice(0, 3).map(previewItem as any),
      });
      // Home과 동일한 로직: notices의 content를 요약으로 활용해 보강
      const notices = await fetchNoticesCleaned(200);
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
      const withSummary = (top10 as any[]).map((e: any) => {
        if (typeof e?.summary === "string" && e.summary.trim()) return e;
        const matched = findNoticeFor(e?.title, e?.sourceUrl);
        const fromContent = matched?.content ? String(matched.content).slice(0, 200) : null;
        return fromContent ? { ...e, summary: fromContent } : e;
      });
      console.log("[HOT] load: after notice-merge", withSummary.slice(0, 3).map(previewItem as any));
      setEvents(withSummary as any);
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
      const top10Raw = await fetchRecentHotTopWithinDays(30, 10);
      console.log("[HOT] refresh: fetched recent hot raw", {
        count: top10Raw.length,
        sample: top10Raw.slice(0, 3).map(previewItem),
      });
      const top10 = await enrichEventsWithTags(top10Raw as any);
      console.log("[HOT] refresh: enriched with tags", {
        count: top10.length,
        sample: (top10 as any[]).slice(0, 3).map(previewItem as any),
      });
      const notices = await fetchNoticesCleaned(200);
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
      const withSummary = (top10 as any[]).map((e: any) => {
        if (typeof e?.summary === "string" && e.summary.trim()) return e;
        const matched = findNoticeFor(e?.title, e?.sourceUrl);
        const fromContent = matched?.content ? String(matched.content).slice(0, 200) : null;
        return fromContent ? { ...e, summary: fromContent } : e;
      });
      console.log("[HOT] refresh: after notice-merge", withSummary.slice(0, 3).map(previewItem as any));
      setEvents(withSummary as any);
    } catch (e) {
      //console.error("[HOT] refresh error", e);
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

