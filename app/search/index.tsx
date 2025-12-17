import React, { useState, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Event } from "../../src/types";
import EventCard from "../../src/components/EventCard";
import { fetchNoticesCleaned } from "../../src/api/eventsFirestore";
import { enrichEventsWithTags, ALLOWED_TAGS } from "../../src/services/tags";
import { searchByAllWords, normalize, extractHashtags, filterItemsByAllTags } from "../../src/services/search";

// 태그별 색상 매핑
const TAG_COLORS: Record<string, { bg: string; text: string; border?: string }> = {
  "수강": { bg: "#E3F2FD", text: "#1976D2", border: "#BBDEFB" },
  "졸업": { bg: "#F3E5F5", text: "#7B1FA2", border: "#CE93D8" },
  "학사": { bg: "#E8F5E9", text: "#388E3C", border: "#A5D6A7" },
  "일반": { bg: "#FAFAFA", text: "#616161", border: "#E0E0E0" },
  "대학원": { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  "취업": { bg: "#FFEBEE", text: "#C62828", border: "#EF9A9A" },
  "공모전": { bg: "#E1F5FE", text: "#0277BD", border: "#81D4FA" },
  "봉사활동": { bg: "#F1F8E9", text: "#558B2F", border: "#AED581" },
  "교내활동": { bg: "#FCE4EC", text: "#C2185B", border: "#F48FB1" },
  "대외활동": { bg: "#E0F2F1", text: "#00695C", border: "#80CBC4" },
};

export default function SearchScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const RECENT_KEY = "recentSearches";

  const isHashtagMode = useMemo(() => {
    const q = normalize(searchQuery);
    return extractHashtags(q).length > 0;
  }, [searchQuery]);

  // 최근 검색어 로드 + 데이터 프리로드(메모리)
  useEffect(() => {
    loadRecentSearches();
    preloadData();
  }, []);

  // 컴포넌트 마운트 시 최근 검색어 재로드
  // (포커스 시 재로드는 네비게이션 훅 문제로 제거)

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
      const notices = await fetchNoticesCleaned(200);
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

    const tags = extractHashtags(q);
    const found = tags.length > 0
      ? filterItemsByAllTags(allItems as any, tags)
      : searchByAllWords(allItems as any, q, ["title", "summary", "tags"] as any);
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

  const handleTagPress = (tag: string) => {
    const tagQuery = `#${tag}`;
    setSearchQuery(tagQuery);
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
        <View style={[styles.searchContainer, isHashtagMode && styles.searchContainerTagActive]}>
          <Ionicons name="search" size={20} color={isHashtagMode ? "#7C3AED" : "#999"} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {isHashtagMode ? (
            <View style={styles.tagModeBadge}>
              <Ionicons name="pricetag" size={14} color="#7C3AED" />
              <Text style={styles.tagModeText}>태그</Text>
            </View>
          ) : null}
        </View>
        
        {/* 태그 안내 및 태그 목록 */}
        {!isSearching && (
          <View style={styles.tagSection}>
            <View style={styles.tagGuide}>
              <Ionicons name="information-circle-outline" size={16} color={scheme === "dark" ? "#999" : "#666"} />
              <Text style={[styles.tagGuideText, { color: scheme === "dark" ? "#bbb" : "#666" }]}>
                #태그명을 통해 관심사별 정보를 모아보세요!
              </Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsContainer}
            >
              {ALLOWED_TAGS.map((tag) => {
                const tagColor = TAG_COLORS[tag] || TAG_COLORS["일반"];
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => handleTagPress(tag)}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: scheme === "dark" 
                          ? `${tagColor.bg}20` 
                          : tagColor.bg,
                        borderColor: scheme === "dark"
                          ? `${tagColor.border}40`
                          : tagColor.border,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.tagChipText,
                      { color: scheme === "dark" ? tagColor.text : tagColor.text }
                    ]}>
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
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
  tagSection: {
    width: "100%",
    marginTop: 16,
  },
  tagGuide: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tagGuideText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "500",
  },
  tagsContainer: {
    paddingRight: 16,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainerTagActive: {
    borderColor: "#E9D5FF",
    backgroundColor: "#FAF5FF",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  tagModeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    marginLeft: 8,
  },
  tagModeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
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


