import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import type { Event } from "../../src/types";
import { ensureUserId, getFavorites as getFavIds, subscribe } from "../../src/services/favorites";
import { fetchNoticesCleaned } from "../../src/api/eventsFirestore";
import { searchByAllWords, normalize } from "../../src/services/search";


export default function FavoritesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allItems, setAllItems] = useState<Event[]>([]);
  const [favEvents, setFavEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 초기 데이터 로드 + 즐겨찾기 구독
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ensureUserId();
        const notices = await fetchNoticesCleaned(1000);
        const mapped: Event[] = (notices || []).map((n: any): Event => ({
          id: `notice-${n.id}`,
          title: n.title,
          summary: n.content ? String(n.content).slice(0, 200) : null,
          startAt: deriveIsoDate(n.date || n.crawled_at || n.firebase_created_at),
          endAt: null,
          location: null,
          tags: ["공지"],
          org: { id: "notice", name: n.author || "공지", logoUrl: null },
          sourceUrl: n.url || null,
          posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
          ai: null,
        }));
        if (!mounted) return;
        setAllItems(mapped);
        const filtered = filterByFavorites(mapped);
        console.log("[FAV] page init", { all: mapped.length, fav: filtered.length });
        setFavEvents(filtered);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 즐겨찾기 변경을 구독하되, 최신 allItems로 필터 재계산
  useEffect(() => {
    const unsub = subscribe(() => setFavEvents(filterByFavorites(allItems)));
    return () => unsub();
  }, [allItems]);

  // 최근 검색어 로드
  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const v = window.localStorage.getItem("favoritesRecentSearches");
        setRecentSearches(v ? JSON.parse(v) : []);
      }
    } catch (error) {
      console.error("최근 검색어 로드 실패:", error);
    }
  };

  const handleSearch = async () => {
    const q = normalize(searchQuery);
    if (!q) {
      setIsSearching(false);
      setFavEvents(filterByFavorites(allItems));
      return;
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const current = window.localStorage.getItem("favoritesRecentSearches");
        const arr = current ? (JSON.parse(current) as string[]) : [];
        const updated = [q, ...arr.filter((x) => x !== q)].slice(0, 10);
        window.localStorage.setItem("favoritesRecentSearches", JSON.stringify(updated));
        setRecentSearches(updated);
      }
    } catch {}
    setIsSearching(true);
    const base = filterByFavorites(allItems);
    const filtered = searchByAllWords<Event>(base, q, ["title", "summary"] as any);
    setFavEvents(filtered as Event[]);
  };

  const reloadFavorites = async () => {
    setRefreshing(true);
    try {
      await ensureUserId();
      const notices = await fetchNoticesCleaned(1000);
      const mapped: Event[] = (notices || []).map((n: any): Event => ({
        id: `notice-${n.id}`,
        title: n.title,
        summary: n.content ? String(n.content).slice(0, 200) : null,
        startAt: deriveIsoDate(n.date || n.crawled_at || n.firebase_created_at),
        endAt: null,
        location: null,
        tags: ["공지"],
        org: { id: "notice", name: n.author || "공지", logoUrl: null },
        sourceUrl: n.url || null,
        posterImageUrl: Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null,
        ai: null,
      }));
      setAllItems(mapped);
      const base = filterByFavorites(mapped);
      const q = normalize(searchQuery);
      if (isSearching && q) {
        const filtered = searchByAllWords<Event>(base, q, ["title", "summary"] as any);
        setFavEvents(filtered as Event[]);
      } else {
        setFavEvents(base);
      }
    } catch (e) {
      console.warn("[FAV] reload error", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRecentSearchPress = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(false);
    setTimeout(() => handleSearch(), 0);
  };

  const handleClearRecent = async () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("favoritesRecentSearches");
      }
      setRecentSearches([]);
    } catch (error) {
      console.error("최근 검색어 삭제 실패:", error);
    }
  };

  const eventFavorites: Event[] = favEvents;

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

  function filterByFavorites(items: Event[]): Event[] {
    const ids = new Set(getFavIds());
    const out = items.filter((e) => ids.has(e.id));
    console.log("[FAV] filter", { in: items.length, ids: ids.size, out: out.length });
    return out;
  }

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
        {!isSearching && <SectionHeader title="즐겨찾기" showMore={false} style={{ paddingHorizontal: 16 }} />}
        {true ? (
          // 검색 결과
          <View style={styles.searchResults}>
            {false ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>검색 중...</Text>
              </View>
            ) : false ? (
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
                refreshing={refreshing}
                onRefresh={reloadFavorites}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            )}
          </View>
        ) : (
          // 항상 즐겨찾기 목록 표시 (검색하지 않을 때)
          <View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>즐겨찾기 로딩 중...</Text>
              </View>
            ) : (
              <EventsList
                events={eventFavorites}
                placeholderColor="#f5f5f5"
                emptyText="즐겨찾기가 없습니다"
                onPressItem={(ev) => {
                  console.log("[UI] favorite event press", ev.id);
                }}
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
