import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getFavorites } from "../../src/api/favorites";
import { FavoriteItem } from "../../src/api/favorites";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";


export default function FavoritesScreen() {
  
  // 즐겨찾기 쿼리
  const favoritesQuery = useInfiniteQuery({
    queryKey: ["favorites"],
    queryFn: ({ pageParam }) => getFavorites({ cursor: pageParam as string | undefined }),
    getNextPageParam: (last: any) => last?.nextCursor ?? undefined,
    initialPageParam: undefined,
  });

  const favorites = (favoritesQuery.data?.pages ?? [])
    .flatMap((page: any) => page.data) as FavoriteItem[];

  // 검색 기능 제거됨
  // 즐겨찾기 중 이벤트 타입만 공용 카드 리스트 형식으로 매핑
  const eventFavorites: Event[] = favorites
    .filter((f) => f.type === "event")
    .map((f) => ({
      id: f.itemId,
      title: f.title,
      summary: null,
      startAt: new Date(f.createdAt).toISOString(),
      endAt: null,
      location: null,
      tags: [],
      org: { id: "favorite", name: "즐겨찾기", logoUrl: null, homepageUrl: null },
      sourceUrl: null,
      ai: null,
    } as Event));

  return (
    <SafeAreaView style={styles.container}>
      {/* 즐겨찾기(이벤트) 목록 - 공용 형식으로 렌더 */}
      <View style={styles.content}>
        <SectionHeader title="즐겨찾기" style={{ marginTop: 0 }} />
        {favoritesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>즐겨찾기 로딩 중...</Text>
          </View>
        ) : (
          <EventsList
            events={eventFavorites}
            placeholderColor="#f5f5f5"
            emptyText={favorites.length ? "즐겨찾기 이벤트가 없습니다." : "즐겨찾기가 없습니다"}
            onPressItem={(ev) => {
              // TODO: 이벤트 상세로 이동 연결
              console.log("[UI] favorite event press", ev.id);
            }}
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
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  favoriteItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});
