import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Event } from "../../src/types";
import EventCard from "../../src/components/EventCard";
import { fetchNoticesCleaned } from "../../src/api/eventsFirestore";
import { enrichEventsWithTags } from "../../src/services/tags";
import { searchByAllWords, normalize } from "../../src/services/search";

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const RECENT_KEY = "recentSearches";

  // 최근 검색어 로드 + 데이터 프리로드(메모리)
  useEffect(() => {
    loadRecentSearches();
    preloadData();
  }, []);

  // 포커스 시 최근 검색어 재로드(다른 화면에서 변경된 내용 동기화)
  useFocusEffect(
    React.useCallback(() => {
      console.log("[SEARCH] focus reload");
      loadRecentSearches();
    }, [])
  );

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_KEY);
      const parsed = saved ? (JSON.parse(saved) as string[]) : [];
      console.log("[SEARCH] loadRecentSearches", { savedLength: parsed.length, items: parsed });
      setRecentSearches(parsed);
    } catch (error) {
      console.error("최근 검색어 로드 실패:", error);
    }
  };

  const preloadData = async () => {
    try {
      const notices = await fetchNoticesCleaned(10);
      const noticeAsEventsRaw: Event[] = (notices || []).map((n: any) => ({
        id: `notice-${n.id}`,
        title: n.title,
        summary: n.content ? String(n.content).slice(0, 200) : null,
        startAt: n.date || n.crawled_at || n.firebase_created_at || "",
        endAt: null,
        location: null,
        tags: [],
        org: { id: "notice", name: n.author || "공지", logoUrl: null },
        sourceUrl: n.url || null,
        posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
        ai: null,
      } as any));
      const noticeAsEvents = await enrichEventsWithTags(noticeAsEventsRaw as any);
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
      const beforeRaw = await AsyncStorage.getItem(RECENT_KEY);
      const before = beforeRaw ? (JSON.parse(beforeRaw) as string[]) : [];
      const updated = [q, ...before.filter((v) => v !== q)].slice(0, 10);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      console.log("[SEARCH] saveRecentSearch", { query: q, before: before.length, after: updated.length });
      setRecentSearches(updated);
    } catch {}

    const found = searchByAllWords(allItems as any, q, ["title", "summary"] as any);
    setIsSearching(true);
    setResults(found);
  };

  const handleRecentSearchPress = async (query: string) => {
    console.log("[SEARCH] pressRecentSearch", { query });
    setSearchQuery(query);
    setIsSearching(false);
    setResults([]);
    setTimeout(() => handleSearch(), 0);
  };

  const handleClearRecent = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_KEY);
      console.log("[SEARCH] clearAllRecent");
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
          // 최근 검색어 (칩 UI)
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>최근 검색어</Text>
              {recentSearches.length > 0 && (
                <Pressable onPress={handleClearRecent}>
                  <Text style={styles.clearButton}>전체삭제</Text>
                </Pressable>
              )}
            </View>
            {recentSearches.length > 0 ? (
              <View style={styles.chipsContainer}>
                {recentSearches.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.chip}>
                    <Pressable style={styles.chipTextWrap} onPress={() => handleRecentSearchPress(item)}>
                      <Text style={styles.chipText} numberOfLines={1}>{item}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.chipClose}
                      hitSlop={8}
                      onPress={() => {
                        const updated = recentSearches.filter((s) => s !== item);
                        console.log("[SEARCH] removeRecent", { item, before: recentSearches.length, after: updated.length });
                        setRecentSearches(updated);
                        try {
                          AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
                        } catch {}
                      }}
                    >
                      <Ionicons name="close" size={16} color="#666" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>최근 검색어가 없습니다</Text>
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
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 12,
  },
  chipTextWrap: {
    maxWidth: 200,
  },
  chipText: {
    fontSize: 16,
    color: "#000",
  },
  chipClose: {
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
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


