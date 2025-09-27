import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import SectionHeader from "../SectionHeader";
import BannerSlider from "../BannerSlider";
import { useEffect, useState } from "react";
import { fetchRecentNews } from "../../api/eventsFirestore";
import EventsList from "../EventsList";

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const placeholder = colorScheme === "dark" ? "#2B2F33" : "#E4EAEE";
  const textColor = colorScheme === "dark" ? "#fff" : "#111";
  const subText = colorScheme === "dark" ? "#C8CDD2" : "#6B7280";
  const [news, setNews] = useState<any[]>([]);

  const handleMorePress = () => {
    router.push("/events");
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRecentNews(20);
        setNews(data);
      } catch (e) {
        console.warn("[UI] fetchRecentNews error", e);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
      >
        {/* 상단 배너 영역 */}
        <View style={{ marginTop: 12, borderRadius: 14, overflow: "hidden" }}>
          <BannerSlider limit={8} onPressItem={(ev) => {
            // TODO: 상세 페이지로 네비게이션 연결
            console.log("[UI] BannerSlider:press", ev.id);
          }} />
        </View>

        {/* 페이지네이션 점 영역은 BannerSlider 내부로 이동 */}

        <SectionHeader title="새로운 소식" onPressMore={handleMorePress} />

        <EventsList
          events={news as any}
          placeholderColor={placeholder}
          onPressItem={(ev: any) => {
            // TODO: 상세 라우팅 연결
            console.log("[UI] news press", ev.id);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}


