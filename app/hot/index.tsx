import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import SectionHeader from "../../src/components/SectionHeader";
import BannerSlider from "../../src/components/BannerSlider";
import { useEffect, useState } from "react";
import { fetchRecentNews } from "../../src/api/eventsFirestore";
import EventCard from "../../src/components/EventCard";
import EventsList from "../../src/components/EventsList";

export default function Home() {
  const colorScheme = useColorScheme();
  const placeholder = colorScheme === "dark" ? "#2B2F33" : "#E4EAEE";
  const textColor = colorScheme === "dark" ? "#fff" : "#111";
  const subText = colorScheme === "dark" ? "#C8CDD2" : "#6B7280";
  const [news, setNews] = useState<any[]>([]);

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
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
      >
        <SectionHeader title="실시간 인기 소식" />

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


