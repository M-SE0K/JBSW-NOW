import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, RefreshControl, View, Button, TextInput, Pressable, ActivityIndicator, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import EventCard from "../../src/components/EventCard";
import Loading from "../../src/components/Loading";
import ErrorState from "../../src/components/ErrorState";
import EmptyState from "../../src/components/EmptyState";
import SectionHeader from "../../src/components/SectionHeader";
import EventsList from "../../src/components/EventsList";
import { fetchNoticesCleaned } from "../../src/api/eventsFirestore";
import { enrichEventsWithTags } from "../../src/services/tags";
import { normalize, tokenize, searchByAllWords } from "../../src/services/search";
import { Event } from "../../src/types";
import { useRouter } from "expo-router";
import { ensureUserId as ensureFavUser, subscribe as subscribeFavorites, hydrateFavorites as hydrateFavs } from "../../src/services/favorites";

export default function EventsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [favTick, setFavTick] = useState<number>(0);

  // 새로운 소식 데이터 로드 (notices만 사용, date 내림차순)
  useEffect(() => {
    (async () => {
      try {
        const notices = await fetchNoticesCleaned(10);
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
        setNews(noticeAsEvents.slice(0, 5));
      } catch (e) {
        console.warn("[UI] fetchRecentNews error", e);
        setNews([]);
      }
    })();
  }, []);

  // 즐겨찾기 변경 구독: 재조회 없이 카드 상태만 리렌더
  useEffect(() => {
    ensureFavUser();
    const unsub = subscribeFavorites(() => setFavTick((v) => v + 1));
    return () => unsub();
  }, []);

  // 화면 포커스 시 로컬 스토리지에서 즐겨찾기 상태 재하이드레이션
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          await hydrateFavs();
        } catch {}
      })();
      return () => {};
    }, [])
  );

  // 현재 렌더링 중인 목록의 상위 3개(title/summary/id) 로그
  useEffect(() => {
    const items = isSearching ? searchResults : news;
    const preview = (items || []).slice(0, 3).map((it: any, idx: number) => ({
      idx: idx + 1,
      id: it?.id,
      title: typeof it?.title === "string" ? it.title.slice(0, 80) : it?.title,
      summary: typeof it?.summary === "string" ? it.summary.slice(0, 200) : it?.summary,
    }));
    console.log("[events] preview", preview);
  }, [isSearching, news, searchResults]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
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
        {!isSearching && <SectionHeader title="새로운 소식" showMore={false} style={{ paddingHorizontal: 16 }} />}
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
            events={news as any}
            placeholderColor="#f5f5f5"
            emptyText="새로운 소식이 없습니다"
            onPressItem={(ev: any) => {
              console.log("[UI] news press", ev.id);
            }}
            extraData={favTick}
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
};
