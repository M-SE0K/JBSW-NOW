import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { searchContent, getRecentSearches, saveRecentSearch, clearRecentSearches } from "../../src/api/search";
import { Event, Org } from "../../src/types";
import EventCard from "../../src/components/EventCard";

export default function SearchScreen() {
  const router = useRouter();
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

  // 검색 쿼리
  const searchQuery_result = useInfiniteQuery({
    queryKey: ["search", searchQuery],
    queryFn: ({ pageParam }) => searchContent({ q: searchQuery, cursor: pageParam as string | undefined }),
    getNextPageParam: (last: any) => last?.nextCursor ?? undefined,
    enabled: isSearching && searchQuery.trim().length > 0,
    initialPageParam: undefined,
  });

  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) return;
    
    setIsSearching(true);
    try {
      await saveRecentSearch(searchQuery.trim());
      await loadRecentSearches();
      searchQuery_result.refetch();
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
      searchQuery_result.refetch();
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

  const allEvents = (searchQuery_result.data?.pages ?? [])
    .flatMap((page: any) => page.events) as Event[];
  const allOrgs = (searchQuery_result.data?.pages ?? [])
    .flatMap((page: any) => page.organizations) as Org[];

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색 헤더 */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 검색 결과 또는 최근 검색어 */}
      <View style={styles.content}>
        {isSearching ? (
          // 검색 결과
          <View style={styles.searchResults}>
            {searchQuery_result.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>검색 중...</Text>
              </View>
            ) : searchQuery_result.isError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>검색 중 오류가 발생했습니다</Text>
              </View>
            ) : allEvents.length > 0 || allOrgs.length > 0 ? (
              <FlatList
                data={[...allEvents, ...allOrgs.map(org => ({ ...org, type: 'organization' }))]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  if ('type' in item && item.type === 'organization') {
                    return (
                      <Pressable 
                        style={styles.resultItem}
                        onPress={() => console.log('조직 클릭:', item)}
                      >
                        <View style={styles.resultContent}>
                          <Ionicons name="business-outline" size={20} color="#666" />
                          <Text style={styles.resultTitle}>{item.name}</Text>
                        </View>
                      </Pressable>
                    );
                  }
                  return (
                    <EventCard 
                      event={item as Event} 
                      onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })} 
                    />
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            )}
          </View>
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
                          window.localStorage.setItem("recentSearches", JSON.stringify(updated));
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
  searchResults: {
    flex: 1,
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
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultTitle: {
    marginLeft: 12,
    fontSize: 16,
    color: "#000",
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
});


