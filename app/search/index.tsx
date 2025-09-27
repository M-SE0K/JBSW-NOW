import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Event } from "../../src/types";
import EventCard from "../../src/components/EventCard";
import { fetchNoticesCleaned } from "../../src/api/eventsFirestore";
import { searchByAllWords, normalize } from "../../src/services/search";

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  // 최근 검색어 로드 + 데이터 프리로드(메모리)
  useEffect(() => {
    loadRecentSearches();
    preloadData();
  }, []);

  const loadRecentSearches = async () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("recentSearches");
        setRecentSearches(saved ? JSON.parse(saved) : []);
      }
    } catch (error) {
      console.error("최근 검색어 로드 실패:", error);
    }
  };

  const preloadData = async () => {
    try {
      const notices = await fetchNoticesCleaned(1000);
      const noticeAsEvents: Event[] = (notices || []).map((n: any) => ({
        id: `notice-${n.id}`,
        title: n.title,
        summary: n.content ? String(n.content).slice(0, 200) : null,
        startAt: n.date || n.crawled_at || n.firebase_created_at || "",
        endAt: null,
        location: null,
        tags: ["공지"],
        org: { id: "notice", name: n.author || "공지", logoUrl: null },
        sourceUrl: n.url || null,
        posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
        ai: null,
      } as any));
      setAllItems(noticeAsEvents);
    } catch (e) {
      console.warn("[UI] preloadData error", e);
      setAllItems([]);
    }
  };

  const handleSearch = async () => {
    const q = normalize(searchQuery);
    if (!q) {
      setIsSearching(false);
      setResults([]);
      return;
    }
    // 최근 검색어 저장
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const current = await (async () => {
          const saved = window.localStorage.getItem("recentSearches");
          return saved ? (JSON.parse(saved) as string[]) : [];
        })();
        const updated = [q, ...current.filter((v) => v !== q)].slice(0, 10);
        window.localStorage.setItem("recentSearches", JSON.stringify(updated));
        setRecentSearches(updated);
      }
    } catch {}

    const found = searchByAllWords(allItems as any, q, ["title", "summary"] as any);
    setIsSearching(true);
    setResults(found);
  };

  const handleRecentSearchPress = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(false);
    setResults([]);
    setTimeout(() => handleSearch(), 0);
  };

  const handleClearRecent = async () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("recentSearches");
      }
      setRecentSearches([]);
    } catch (error) {
      console.error("최근 검색어 삭제 실패:", error);
    }
  };

  const allEvents = results;

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
            {allEvents.length > 0 ? (
              <FlatList
                data={allEvents}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <EventCard 
                    event={item as Event} 
                    onPress={() => router.push({ pathname: "/events/[id]", params: { id: item.id } })} 
                  />
                )}
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


