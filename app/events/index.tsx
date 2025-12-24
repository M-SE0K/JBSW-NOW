import React, { useCallback, useMemo, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, RefreshControl, View, Button, TextInput, Pressable, ActivityIndicator, Text, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import EventCard from "../../src/components/EventCard";
import Loading from "../../src/components/Loading";
import ErrorState from "../../src/components/ErrorState";
import EmptyState from "../../src/components/EmptyState";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import { fetchNoticesCleaned } from "../../src/api/eventsFirestore";
import { enrichEventsWithTags, ALLOWED_TAGS } from "../../src/services/tags";
import { normalize, tokenize, searchByAllWords } from "../../src/services/search";
import { Event } from "../../src/types";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ensureUserId as ensureFavUser, subscribe as subscribeFavorites, hydrateFavorites as hydrateFavs } from "../../src/services/favorites";

// 태그별 색상 매핑 (검색 페이지와 동일)
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

export default function EventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tag?: string }>();
  const scheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [favTick, setFavTick] = useState<number>(0);

  // URL 파라미터에서 tag를 받아서 초기 selectedTag 설정
  useEffect(() => {
    if (params.tag && typeof params.tag === "string") {
      setSelectedTag(params.tag);
    }
  }, [params.tag]);

  // 새로운 소식 데이터 로드 (notices만 사용, date 내림차순)
  useEffect(() => {
    (async () => {
      try {
        const notices = await fetchNoticesCleaned(100);
        const noticeAsEventsRaw = (notices || []).map((n: any) => {
          const startAtIso = deriveIsoDate(n.date || n.crawled_at || n.firebase_created_at);
          return {
            id: `notice-${n.id}`,
            title: n.title,
            summary: n.content ? String(n.content).slice(0, 200) : null,
            startAt: startAtIso,
            endAt: null,
            location: null,
            tags: [],
            org: { id: "notice", name: n.author || "공지", logoUrl: null },
            sourceUrl: n.url || null,
            posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
            ai: null,
          } as any;
        });

        const noticeAsEvents = await enrichEventsWithTags(noticeAsEventsRaw as any);
        noticeAsEvents.sort((a: any, b: any) => (toDateMsFromString(b.startAt) - toDateMsFromString(a.startAt)));
        setAllItems(noticeAsEvents);
      } catch (e) {
        console.warn("[UI] fetchRecentNews error", e);
        setAllItems([]);
      }
    })();
  }, []);

  // 즐겨찾기 변경 구독: 재조회 없이 카드 상태만 리렌더
  useEffect(() => {
    ensureFavUser();
    const unsub = subscribeFavorites(() => setFavTick((v) => v + 1));
    return () => unsub();
  }, []);

  // 컴포넌트 마운트 시 즐겨찾기 상태 로드
  useEffect(() => {
    (async () => {
      try {
        await hydrateFavs();
      } catch {}
    })();
  }, []);

  // 모든 태그 추출
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allItems.forEach((event) => {
      event.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allItems]);

  // 태그별 필터링된 이벤트
  const filteredNews = useMemo(() => {
    let filtered = allItems;
    if (selectedTag) {
      filtered = filtered.filter((event) => event.tags?.includes(selectedTag));
    }
    return filtered;
  }, [allItems, selectedTag]);

  // 현재 렌더링 중인 목록의 상위 3개(title/summary/id) 로그
  useEffect(() => {
    const items = isSearching ? searchResults : filteredNews;
    const preview = (items || []).slice(0, 3).map((it: any, idx: number) => ({
      idx: idx + 1,
      id: it?.id,
      title: typeof it?.title === "string" ? it.title.slice(0, 80) : it?.title,
      summary: typeof it?.summary === "string" ? it.summary.slice(0, 200) : it?.summary,
    }));
    console.log("[events] preview", preview);
  }, [isSearching, filteredNews, searchResults]);

  function deriveIsoDate(input?: string | null): string {
    if (!input || typeof input !== "string") return new Date().toISOString();
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).toISOString();
    const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(Date.UTC(y, Math.max(0, mo - 1), d, 0, 0, 0));
      return dt.toISOString();
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
    return new Date().toISOString();
  }

  function toDateMsFromString(s?: string | null): number {
    if (!s || typeof s !== "string") return 0;
    const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(y, Math.max(0, mo - 1), d, 0, 0, 0);
      return dt.getTime();
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? 0 : t;
  }

  const handleSearch = () => {
    const q = normalize(searchQuery);
    if (!q) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    const results = searchByAllWords(allItems, q, ["title", "summary"] as any);
    setIsSearching(true);
    setSearchResults(results);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom", "left", "right"]}>
      {/* 검색 헤더 */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="새로운 소식 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 검색 결과 또는 새로운 소식 목록 */}
      <View style={styles.content}>
        {isSearching ? (
          // 검색 결과
          <View style={styles.searchResults}>
            {searchResults.length > 0 ? (
              <EventsList
                events={searchResults as any}
                placeholderColor="#f5f5f5"
                emptyText="검색 결과가 없습니다"
                onPressItem={(ev: any) => {
                  console.log("[UI] search result press", ev.id);
                }}
                extraData={favTick}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            )}
          </View>
        ) : (
          // 새로운 소식 목록
          <EventsList
            events={filteredNews as any}
            placeholderColor="#f5f5f5"
            emptyText={selectedTag ? `#${selectedTag} 태그의 새로운 소식이 없습니다` : "새로운 소식이 없습니다"}
            onPressItem={(ev: any) => {
              console.log("[UI] news press", ev.id);
            }}
            extraData={favTick}
            ListHeaderComponent={
              <View>
                <SectionHeader title="새로운 소식" showMore={false} style={{ paddingHorizontal: 16 }} />
                {allTags.length > 0 && (
                  <View style={styles.tagFilterContainer}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagFilterScroll}
                    >
                      <TouchableOpacity
                        onPress={() => setSelectedTag(null)}
                        style={[
                          styles.tagButton,
                          { backgroundColor: selectedTag === null 
                            ? (scheme === "dark" ? "#2f80ed" : "#2f80ed")
                            : (scheme === "dark" ? "#2a2a2a" : "#f1f1f1")
                          }
                        ]}
                      >
                        <Text style={[
                          styles.tagButtonText,
                          { color: selectedTag === null 
                            ? "#fff" 
                            : (scheme === "dark" ? "#ddd" : "#333")
                          }
                        ]}>
                          전체
                        </Text>
                      </TouchableOpacity>
                      {allTags.map((tag) => {
                        const tagColor = TAG_COLORS[tag] || TAG_COLORS["일반"];
                        return (
                          <TouchableOpacity
                            key={tag}
                            onPress={() => setSelectedTag(tag)}
                            style={[
                              styles.tagButton,
                              { backgroundColor: selectedTag === tag
                                ? (scheme === "dark" ? "#2f80ed" : "#2f80ed")
                                : (scheme === "dark" 
                                    ? `${tagColor.bg}30` 
                                    : tagColor.bg)
                              }
                            ]}
                          >
                            <Text style={[
                              styles.tagButtonText,
                              { color: selectedTag === tag
                                ? "#fff"
                                : (scheme === "dark" ? tagColor.text : tagColor.text)
                              }
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
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchContainer: {
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
  },
  searchResults: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  tagFilterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tagFilterScroll: {
    paddingRight: 16,
  },
  tagButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 36,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  tagButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
};
