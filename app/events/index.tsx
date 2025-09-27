import React, { useCallback, useMemo, useState, useEffect } from "react";
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
import { fetchEvents } from "../../src/api/events";
import { fetchRecentNews, searchHotNews, saveHotRecentSearch } from "../../src/api/eventsFirestore";
import { Event } from "../../src/types";
import { useRouter } from "expo-router";

export default function EventsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);

  // 새로운 소식 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRecentNews(20);
        setNews(data);
      } catch (e) {
        console.warn("[UI] fetchRecentNews error", e);
        setNews([]);
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) return;
    
    setIsSearching(true);
    try {
      await saveHotRecentSearch(searchQuery.trim());
      const results = await searchHotNews(searchQuery.trim(), 20);
      setSearchResults(results);
    } catch (error) {
      console.error("검색 실패:", error);
    }
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
        {!isSearching && <SectionHeader title="새로운 소식" showMore={false} style={{ marginTop: 0 }} />}
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
    paddingHorizontal: 16,
    paddingTop: 20,
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
