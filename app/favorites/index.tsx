import React, { useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator } from "react-native";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";
import { ensureUserId, getFavorites as getFavIds, subscribe, hydrateFavorites as hydrateFavs } from "../../src/services/favorites";
import { fetchNoticesCleaned, fetchRecentNewsWithinDays } from "../../src/api/eventsFirestore";
import { enrichEventsWithTags } from "../../src/services/tags";

export default function FavoritesScreen() {
  const [allItems, setAllItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [favTick, setFavTick] = useState<number>(0);

  // 모든 데이터 로드(공지 + 이벤트) 후 상태 보관
  const loadAll = async () => {
    setLoading(true);
    try {
      await ensureUserId();
      const [notices, recentEvents] = await Promise.all([
        fetchNoticesCleaned(80),
        fetchRecentNewsWithinDays(90, 300),
      ]);
      const mappedNotices: Event[] = (notices || []).map((n: any): Event => ({
        id: `notice-${n.id}`,
        title: n.title,
        summary: n.content ? String(n.content).slice(0, 200) : null,
        startAt: n.date || n.crawled_at || n.firebase_created_at || new Date().toISOString(),
        endAt: null,
        location: null,
        tags: ["공지"],
        org: { id: "notice", name: n.author || "공지", logoUrl: null },
        sourceUrl: n.url || null,
        posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
        ai: null,
      }));
      const noticesWithTags = await enrichEventsWithTags(mappedNotices as any);
      const mergedMap = new Map<string, Event>();
      [...noticesWithTags, ...(recentEvents || [])].forEach((e) => { if (e && e.id) mergedMap.set(e.id, e); });
      setAllItems(Array.from(mergedMap.values()));
    } catch (e) {
      console.warn("[FAV] loadAll error", e);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // 즐겨찾기 변경 구독 → 리스트 리렌더
  useEffect(() => {
    const unsub = subscribe(() => setFavTick((v) => v + 1));
    return () => unsub();
  }, []);

  // 포커스 시 로컬 스토리지에서 즐겨찾기 재하이드레이션 + 데이터 재계산
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          await hydrateFavs();
          setFavTick((v) => v + 1);
        } catch {}
      })();
      return () => {};
    }, [])
  );

  // 즐겨찾기 id 집합에 따라 필터링된 피드
  const favoriteFeed = useMemo(() => {
    const favIds = new Set(getFavIds());
    return allItems.filter((e) => favIds.has(e.id));
  }, [allItems, favTick]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
      await hydrateFavs();
      setFavTick((v) => v + 1);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>즐겨찾기</Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={{ marginTop: 10, color: "#666" }}>로딩 중...</Text>
          </View>
        ) : (
          <EventsList
            events={favoriteFeed}
            placeholderColor="#f5f5f5"
            emptyText="즐겨찾기가 없습니다"
            onPressItem={(ev) => {}}
            refreshing={refreshing}
            onRefresh={onRefresh}
            extraData={favTick}
          />
        )}
      </View>
    </SafeAreaView>
  );
}


