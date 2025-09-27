import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getFavorites, searchFavorites, getRecentSearches, saveRecentSearch, clearRecentSearches } from "../../src/api/favorites";
import { FavoriteItem } from "../../src/api/favorites";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";


export default function FavoritesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 최근 검색어 로드
  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const recent = await getRecentSearches();
      setRecentSearches(recent);
    } catch (error) {
      console.error("최근 검색어 로드 실패:", error);
    }
  };

  // 즐겨찾기 쿼리
  const favoritesQuery = useInfiniteQuery({
    queryKey: ["favorites"],
    queryFn: ({ pageParam }) => getFavorites({ cursor: pageParam as string | undefined }),
    getNextPageParam: (last: any) => last?.nextCursor ?? undefined,
    initialPageParam: undefined,
  });

  // 즐겨찾기 검색 쿼리
  const favoritesSearchQuery = useInfiniteQuery({
    queryKey: ["favorites-search", searchQuery],
    queryFn: ({ pageParam }) => searchFavorites({ q: searchQuery, cursor: pageParam as string | undefined }),
    getNextPageParam: (last: any) => last?.nextCursor ?? undefined,
    enabled: isSearching && searchQuery.trim().length > 0,
    initialPageParam: undefined,
  });

  const favorites = (favoritesQuery.data?.pages ?? [])
    .flatMap((page: any) => page.data) as FavoriteItem[];

  const searchResults = (favoritesSearchQuery.data?.pages ?? [])
    .flatMap((page: any) => page.data) as FavoriteItem[];

  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) return;
    
    setIsSearching(true);
    try {
      await saveRecentSearch(searchQuery.trim());
      await loadRecentSearches();
      favoritesSearchQuery.refetch();
    } catch (error) {
      console.error("검색 실패:", error);
    }
  };

  const handleRecentSearchPress = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    try {
      await saveRecentSearch(query);
      await loadRecentSearches();
      favoritesSearchQuery.refetch();
    } catch (error) {
      console.error("최근 검색어 검색 실패:", error);
    }
  };

  const handleClearRecent = async () => {
    try {
      await clearRecentSearches();
      setRecentSearches([]);
    } catch (error) {
      console.error("최근 검색어 삭제 실패:", error);
    }
  };

  // 즐겨찾기 중 이벤트 타입만 공용 카드 리스트 형식으로 매핑
  const eventFavorites: Event[] = (isSearching ? searchResults : favorites)
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
      {/* 검색 헤더 */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="즐겨찾기 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 검색 결과 또는 즐겨찾기 목록 */}
      <View style={styles.content}>
        {!isSearching && <SectionHeader title="즐겨찾기" showMore={false} style={{ marginTop: 0 }} />}
        {isSearching ? (
          // 검색 결과
          <View style={styles.searchResults}>
            {favoritesSearchQuery.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>검색 중...</Text>
              </View>
            ) : favoritesSearchQuery.isError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>검색 중 오류가 발생했습니다</Text>
              </View>
            ) : eventFavorites.length > 0 ? (
              <EventsList
                events={eventFavorites}
                placeholderColor="#f5f5f5"
                emptyText="검색 결과가 없습니다"
                onPressItem={(ev) => {
                  console.log("[UI] favorite event press", ev.id);
                }}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            )}
          </View>
        ) : (
          // 즐겨찾기 목록 또는 최근 검색어
          <View>
            {favoritesQuery.isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>즐겨찾기 로딩 중...</Text>
              </View>
            ) : eventFavorites.length > 0 ? (
              <EventsList
                events={eventFavorites}
                placeholderColor="#f5f5f5"
                emptyText="즐겨찾기가 없습니다"
                onPressItem={(ev) => {
                  console.log("[UI] favorite event press", ev.id);
                }}
              />
            ) : (
              // 최근 검색어
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>최근 검색어</Text>
                  {recentSearches.length > 0 && (
                    <Pressable onPress={handleClearRecent}>
                      <Text style={styles.clearButton}>전체 삭제</Text>
                    </Pressable>
                  )}
                </View>
                
                {recentSearches.length > 0 && (
                  <FlatList
                    data={recentSearches}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    renderItem={({ item }) => (
                      <Pressable 
                        style={styles.recentItem}
                        onPress={() => handleRecentSearchPress(item)}
                      >
                        <Ionicons name="time-outline" size={16} color="#999" />
                        <Text style={styles.recentText}>{item}</Text>
                        <Pressable 
                          onPress={() => {
                            const updated = recentSearches.filter(search => search !== item);
                            setRecentSearches(updated);
                            if (typeof window !== "undefined" && window.localStorage) {
                              window.localStorage.setItem("favoritesRecentSearches", JSON.stringify(updated));
                            }
                          }}
                        >
                          <Ionicons name="close" size={16} color="#999" />
                        </Pressable>
                      </Pressable>
                    )}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            )}
          </View>
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
  header: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  searchResults: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  clearButton: {
    fontSize: 14,
    color: "#007AFF",
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  recentText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#000",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
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
});
