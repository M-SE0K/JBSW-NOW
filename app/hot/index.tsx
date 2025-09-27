import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, useColorScheme, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SectionHeader from "../../src/components/SectionHeader";
import BannerSlider from "../../src/components/BannerSlider";
import { fetchRecentNews, searchHotNews, saveHotRecentSearch } from "../../src/api/eventsFirestore";
import EventCard from "../../src/components/EventCard";
import EventsList from "../../src/components/EventsList";

export default function Home() {
  const colorScheme = useColorScheme();
  const placeholder = colorScheme === "dark" ? "#2B2F33" : "#E4EAEE";
  const textColor = colorScheme === "dark" ? "#fff" : "#111";
  const subText = colorScheme === "dark" ? "#C8CDD2" : "#6B7280";
  const [news, setNews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRecentNews(20);
        // 항상 모의 데이터와 실제 데이터를 합쳐서 설정
        const mockData = getMockHotNews();
        setNews([...mockData, ...data]);
      } catch (e) {
        console.warn("[UI] fetchRecentNews error", e);
        // 오류 발생 시 인기소식 모의 데이터 설정
        setNews(getMockHotNews());
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
            placeholder="인기소식 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 검색 결과 또는 인기소식 목록 */}
      <View style={styles.content}>
        {!isSearching && <SectionHeader title="새로운 인기 소식" showMore={false} style={{ marginTop: 0 }} />}
        {isSearching ? (
          // 검색 결과
          <View style={styles.searchResults}>
            {searchResults.length > 0 ? (
              <EventsList
                events={searchResults as any}
                placeholderColor={placeholder}
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
          // 인기소식 목록
          <EventsList
            events={news as any}
            placeholderColor={placeholder}
            emptyText="인기소식이 없습니다"
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

// 인기소식 모의 데이터
function getMockHotNews(): any[] {
  return [
    {
      id: "mock_hot_1",
      title: "🔥 인기! 전북대학교 해커톤 대회 참가자 모집",
      summary: "전북대학교에서 주최하는 2024년 해커톤 대회 참가자를 모집합니다. 48시간 동안 팀을 이루어 혁신적인 아이디어를 구현해보세요!",
      startAt: "2024-11-20T10:00:00Z",
      endAt: "2024-11-22T18:00:00Z",
      location: "전북대학교 창의관 3층",
      tags: ["해커톤", "전북대학교", "개발", "인기"],
      org: {
        id: "org_jbnu_dev",
        name: "전북대학교 개발동아리",
        logoUrl: null,
        homepageUrl: "https://dev.jbnu.ac.kr"
      },
      sourceUrl: null,
      posterImageUrl: null,
      ai: null,
    }
  ];
}
