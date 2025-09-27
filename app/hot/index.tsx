import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";
import { fetchRecentHotTopWithinDays } from "../../src/services/hot";
import { subscribe as subscribeFavorites, ensureUserId as ensureFavUser } from "../../src/services/favorites";

export default function HotScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [favTick, setFavTick] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const top10 = await fetchRecentHotTopWithinDays(30, 10);
      setEvents(top10);
      try {
        const simplify = (e: Event) => ({ id: e.id, title: String(e.title || "").slice(0, 80), org: e.org?.name ?? null, startAt: e.startAt ?? null, url: e.sourceUrl ?? null });
        const simple = top10.map(simplify);
        //console.log("[hot] top10", simple);
        top10.forEach((e, idx) => {
          const t = String(e.title || "").replace(/\s+/g, " ").trim();
          //console.log(`[hot] ${idx + 1}. ${t.slice(0, 80)} | ${e.id}`);
        });
      } catch {}
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
      const top10 = await fetchRecentHotTopWithinDays(30, 10);
      setEvents(top10);
      try {
        const simplify = (e: Event) => ({ id: e.id, title: String(e.title || "").slice(0, 80), org: e.org?.name ?? null, startAt: e.startAt ?? null, url: e.sourceUrl ?? null });
        const simple = top10.map(simplify);
        //console.log("[hot] top10", simple);
        top10.forEach((e, idx) => {
          const t = String(e.title || "").replace(/\s+/g, " ").trim();
          //console.log(`[hot] ${idx + 1}. ${t.slice(0, 80)} | ${e.id}`);
        });
      } catch {}
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

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.content}>
<<<<<<< HEAD
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>불러오는 중...</Text>
=======
        {!isSearching && <SectionHeader title="새로운 인기 소식" showMore={false} style={{ paddingHorizontal: 16 }} />}
        {isSearching ? (
          // 검색 결과
          <View style={styles.searchResults}>
            {searchResults.length > 0 ? (
              <EventsList
                events={searchResults as any}
                placeholderColor={placeholder}
                emptyText="검색 결과가 없습니다"
                onPressItem={(ev: any) => {
                  console.log("[UI] search result press", ev.id);
                }}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            )}
>>>>>>> main
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

