import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, useColorScheme, Text, StyleSheet, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeroBanner from "../HeroBanner";
import UniversityFilter from "../UniversityFilter";
import { RAGBotCard, AcademicScheduleCard, NoticesCard } from "../Sidebar";
import { ensureUserId as ensureFavUser, subscribe as subscribeFavorites, hydrateFavorites as hydrateFavs } from "../../services/favorites";
import { fetchRecentNews, fetchNoticesCleaned } from "../../api/eventsFirestore";
import { enrichEventsWithTags, classifyEventTags } from "../../services/tags";
import EventsList from "../EventsList";
import EventCard from "../EventCard";
import type { Event } from "../../types";

const isWeb = Platform.OS === "web";
const SIDEBAR_WIDTH = isWeb ? 300 : 0;

type University = "전체" | "전북대" | "군산대" | "원광대" | "SW사업단";

export default function Home() {
  const colorScheme = useColorScheme();
  const placeholder = colorScheme === "dark" ? "#2B2F33" : "#E4EAEE";
  const textColor = colorScheme === "dark" ? "#fff" : "#111";
  const subText = colorScheme === "dark" ? "#C8CDD2" : "#6B7280";
  const router = useRouter();
  const [news, setNews] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [newsLimit, setNewsLimit] = useState<number>(200);
  const [noticeLimit, setNoticeLimit] = useState<number>(3);
  const [favTick, setFavTick] = useState<number>(0);
  const [selectedUniversity, setSelectedUniversity] = useState<University>("전체");

  const handleMorePress = () => {
    router.push("/events");
  };

  useEffect(() => {
    (async () => {
      try {
        // 이벤트와 공지를 병렬로 조회
        const [eventsDataRaw, notices] = await Promise.all([
          fetchRecentNews(newsLimit),
          fetchNoticesCleaned(noticeLimit),
        ]);


        // Notice를 Event 형태로 매핑하며 Gemini 기반 태그 라벨링 적용
        const noticeAsEvents = await Promise.all((notices || []).map(async (n: any) => {
          const firstImage = Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null;
          const startAtIso = deriveIsoDate(n.date || n.crawled_at || n.firebase_created_at);
          const baseEvent = {
            id: `notice-${n.id}`,
            title: n.title,
            summary: n.content ? String(n.content).slice(0, 200) : null,
            startAt: startAtIso,
            endAt: null,
            location: null,
            tags: [],
            org: { id: "notice", name: n.author || "공지", logoUrl: null },
            sourceUrl: n.url || null,
            posterImageUrl: firstImage,
            ai: null,
          } as any;
          try {
            const tags = await classifyEventTags(baseEvent as any);
            return { ...baseEvent, tags } as any;
          } catch {
            return { ...baseEvent, tags: ["공지"] } as any;
          }
        }));

        // 이벤트 태그 정제/보강
        const eventsData = await enrichEventsWithTags(Array.isArray(eventsDataRaw) ? eventsDataRaw : [] as any);

        const merged = [...noticeAsEvents, ...eventsData];
        setNotices(noticeAsEvents);
        setNews(merged);
      } catch (e) {
        console.warn("[UI] fetchRecentNews error", e);
      }
    })();
  }, [newsLimit, noticeLimit]);

  // 즐겨찾기 변경 구독: 재조회 없이 카드 상태만 리렌더
  useEffect(() => {
    ensureFavUser();
    const unsub = subscribeFavorites(() => setFavTick((v) => v + 1));
    // 화면 마운트 시 로컬 스토리지에서 즐겨찾기 상태 재하이드레이션
    (async () => {
      try {
        await hydrateFavs();
      } catch {}
    })();
    return () => unsub();
  }, []);

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

  const filteredNews = useMemo(() => {
    if (selectedUniversity === "전체") {
      return news;
    }
    return news.filter((item) => {
      const orgName = item.org?.name || "";
      const tags = item.tags || [];
      const allText = `${orgName} ${tags.join(" ")}`.toLowerCase();
      
      const univMap: Record<University, string[]> = {
        "전체": [],
        "전북대": ["전북대", "전북", "jbnu"],
        "군산대": ["군산대", "군산", "kunsan"],
        "원광대": ["원광대", "원광", "wonkwang"],
        "SW사업단": ["sw사업단", "사업단", "sw"],
      };
      
      const keywords = univMap[selectedUniversity];
      return keywords.some(keyword => allText.includes(keyword.toLowerCase()));
    });
  }, [news, selectedUniversity]);

  const headerComponent = (
    <View style={{ paddingTop: 16 }}>
      <View style={styles.headerWrapper}>
        <HeroBanner />
        <View style={styles.feedHeader}>
          <View style={styles.feedTitleRow}>
            <Text style={[styles.feedTitle, { color: textColor }]}>
              실시간 통합 피드
            </Text>
            <View style={[styles.aiUpdatingBadge, { backgroundColor: colorScheme === "dark" ? "#1E293B" : "#F1F5F9" }]}>
              <Ionicons name="sparkles" size={10} color="#4F46E5" />
              <Text style={[styles.aiUpdatingText, { color: subText }]}>AI Updating...</Text>
            </View>
          </View>
          <UniversityFilter 
            selectedUniversity={selectedUniversity}
            onSelectUniversity={setSelectedUniversity}
          />
        </View>
      </View>
    </View>
  );

  const sidebarComponent = (
    <View style={styles.sidebar}>
      {isWeb && <RAGBotCard />}
      <AcademicScheduleCard />
      <NoticesCard notices={notices} onPressMore={handleMorePress} />
    </View>
  );
  if (isWeb) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#0F172A" : "#F9FAFB" }} edges={["left", "right", "bottom"]}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {headerComponent}
          <View style={styles.contentWrapper}>
            <View style={styles.mainContent}>
              <View style={styles.feedContainer}>
                {filteredNews.length === 0 ? (
                  <View style={[styles.emptyState, { backgroundColor: placeholder }]}>
                    <Text style={{ color: "#888" }}>최근 소식이 없습니다.</Text>
                  </View>
                ) : (
                  filteredNews.map((item) => (
                    <EventCard 
                      key={item.id}
                      event={item} 
                      onPress={() => {
                        // TODO: 상세 라우팅 연결
                      }}
                    />
                  ))
                )}
              </View>
              <View style={styles.sidebarContainer}>
                {sidebarComponent}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#0F172A" : "#F9FAFB" }} edges={["left", "right"]}>
      <EventsList
        events={filteredNews as any}
        placeholderColor={placeholder}
        extraData={favTick}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={
          <View style={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}>
            {sidebarComponent}
          </View>
        }
        onPressItem={(ev: any) => {
          // TODO: 상세 라우팅 연결
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    maxWidth: 1400,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: Platform.OS === "web" ? 24 : 4,
  },
  feedHeader: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  feedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  feedTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginRight: 8,
  },
  aiUpdatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiUpdatingText: {
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 4,
  },
  contentWrapper: {
    width: "100%",
    paddingHorizontal: 24,
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: 1400,
    alignSelf: "center",
    width: "100%",
    paddingTop: 8,
    paddingBottom: 24,
  },
  feedContainer: {
    flex: 1,
    marginRight: 32,
    minWidth: 0,
  },
  sidebarContainer: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
  },
  sidebar: {},
  emptyState: {
    height: 120,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
});


