import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import SectionHeader from "../SectionHeader";
import BannerSlider from "../BannerSlider";
import { useEffect, useState } from "react";
import { ensureUserId as ensureFavUser, subscribe as subscribeFavorites } from "../../services/favorites";
import { fetchRecentNews, fetchNoticesCleaned } from "../../api/eventsFirestore";
import EventsList from "../EventsList";

export default function Home() {
  const colorScheme = useColorScheme();
  const placeholder = colorScheme === "dark" ? "#2B2F33" : "#E4EAEE";
  const textColor = colorScheme === "dark" ? "#fff" : "#111";
  const subText = colorScheme === "dark" ? "#C8CDD2" : "#6B7280";
  const router = useRouter();
  const [news, setNews] = useState<any[]>([]);
  const [newsLimit, setNewsLimit] = useState<number>(20);
  const [noticeLimit, setNoticeLimit] = useState<number>(3);
  const [favTick, setFavTick] = useState<number>(0);

  const handleMorePress = () => {
    router.push("/events");
  };

  useEffect(() => {
    (async () => {
      try {
        // 이벤트와 공지를 병렬로 조회
        const [eventsData, notices] = await Promise.all([
          fetchRecentNews(newsLimit),
          fetchNoticesCleaned(noticeLimit),
        ]);

        console.log("[UI] Home:fetch done", {
          eventsCount: Array.isArray(eventsData) ? eventsData.length : 0,
          noticesCount: Array.isArray(notices) ? notices.length : 0,
        });
        // notices: Title과 date만 로그 출력
        if (Array.isArray(notices)) {
          const preview = notices.map((n: any) => ({
            title: typeof n.title === "string" ? n.title.slice(0, 80) : n.title,
            date: n.date ?? n.crawled_at ?? n.firebase_created_at ?? null,
          }));
          console.log("[UI] Home:notices (title, date)", preview);
        }
        ;(notices || []).slice(0, 20).forEach((n: any, i: number) => {
          // console.log("[UI] Home:notice sample", i, {
          //   id: n.id,
          //   title: typeof n.title === "string" ? n.title.slice(0, 120) : n.title,
          //   url: n.url || null,
          // });
        });

        // Notice를 Event 형태로 간단 매핑(표시를 위한 최소 필드)
        const noticeAsEvents = (notices || []).map((n: any) => {
          const firstImage = Array.isArray(n.image_urls) && n.image_urls.length > 0 ? n.image_urls[0] : null;
          const startAtIso = deriveIsoDate(n.date || n.crawled_at || n.firebase_created_at);
          return {
            id: `notice-${n.id}`,
            title: n.title,
            summary: n.content ? String(n.content).slice(0, 200) : null,
            startAt: startAtIso,
            endAt: null,
            location: null,
            tags: ["공지"],
            org: { id: "notice", name: n.author || "공지", logoUrl: null },
            sourceUrl: n.url || null,
            posterImageUrl: firstImage,
            ai: null,
          } as any;
        });

        // 공지 3건 + 기존 이벤트를 묶어서 렌더링
        const merged = [...noticeAsEvents, ...eventsData];
        console.log("[UI] Home:merged feed size", merged.length);
        // 현재 피드 표시 순서 로그: Title과 date만
        console.log(
          "[UI] Home:feed (title, date)",
          merged.map((it: any) => ({
            title: typeof it.title === "string" ? it.title.slice(0, 80) : it.title,
            date: it.startAt || null,
          }))
        );
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
    return () => unsub();
  }, []);

  // 다양한 날짜 문자열(예: 2025.07.30, 2025. 7. 28.(월), ISO 등)을 ISO로 정규화
  function deriveIsoDate(input?: string | null): string {
    if (!input || typeof input !== "string") return new Date().toISOString();
    const s = input.trim();
    // 이미 ISO인 경우
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).toISOString();
    // 2025.07.30 또는 2025. 7. 30. (월) 형태를 포착
    const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(Date.UTC(y, Math.max(0, mo - 1), d, 0, 0, 0));
      return dt.toISOString();
    }
    // 그 외 문자열은 Date 파서에 위임(실패 시 현재 시각)
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["left", "right", "bottom"]}>
      <EventsList
        events={news as any}
        placeholderColor={placeholder}
        extraData={favTick}
        ListHeaderComponent={
          <View>
            {/* 상단 배너 영역 */}
            <View style={{ marginTop: 12, borderRadius: 14, overflow: "hidden" }}>
              <BannerSlider
                imageUrls={[
                  "https://swuniv.jbnu.ac.kr/_data/sys_program_list/1756799978_8_uk3XLIRb1eoAs5mFiqZR_C5FQz5bs8WzFzk5iYy68b6a3ea.jpg",
                  "https://swuniv.jbnu.ac.kr/_data/sys_program_list/1753667195_ZPaSl1QTX9Dcu5Q7PpBj6Di9VFUFNjbRQw3HNxs8j6886d67b.jpg",
                  "https://img2.stibee.com/104257_3015028_1758707911021760055.png",
                  "https://csai.jbnu.ac.kr/CrossEditor/binary/images/000858/20250926092439830_MFYZGK2M.png",
                  "https://sw.kunsan.ac.kr/_data/sys_program_list/1756961870_z2DhygbkGkgi4_DhICuEXjBXX6NJt3r3oZj8YfFhb68b91c4e.jpg",
                  "https://sw.kunsan.ac.kr/_data/sys_program_list/1758521361_Pgm2cRhLVDaidx81VpefRHzFE8_VIZK6W2eKuxu2m68d0e811.png",
                ]}
              />
            </View>
            {/* 페이지네이션 점 영역은 BannerSlider 내부로 이동 */}
            <SectionHeader title="새로운 소식" onPressMore={handleMorePress} />
          </View>
        }
        onPressItem={(ev: any) => {
          // TODO: 상세 라우팅 연결
          //console.log("[UI] news press", ev.id);
        }}
      />
    </SafeAreaView>
  );
}


