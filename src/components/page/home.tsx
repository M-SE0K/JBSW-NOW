import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import BannerSlider from "../BannerSlider";
import { useEffect, useState } from "react";
import { fetchRecentNews } from "../../api/eventsFirestore";
import EventCard from "../EventCard";

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
        {/* 상단 배너 영역 */}
        <View style={{ marginTop: 12, borderRadius: 14, overflow: "hidden" }}>
          <BannerSlider limit={8} onPressItem={(ev) => {
            // TODO: 상세 페이지로 네비게이션 연결
            console.log("[UI] BannerSlider:press", ev.id);
          }} />
        </View>

        {/* 페이지네이션 점 영역은 BannerSlider 내부로 이동 */}

        {/* 섹션 헤더 */}
        <View style={{ marginTop: 20, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: textColor }}>새로운 소식</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>더보기 ▸</Text>
        </View>

        {/* 세로 리스트 렌더 */}
        <View style={{ marginTop: 4 }}>
          {news.map((ev) => (
            <EventCard key={ev.id} event={ev} onPress={() => {
              // TODO: 상세 라우팅 연결
              console.log("[UI] news press", ev.id);
            }} />
          ))}
          {!news.length && (
            <View style={{ height: 120, borderRadius: 12, backgroundColor: placeholder, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: subText }}>최근 소식이 없습니다.</Text>
            </View>
          )}
          
        </View>
          {/* 섹션 헤더 */}
          <View style={{ marginTop: 20, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: textColor }}>실시간 인기 소식</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>더보기 ▸</Text>
        </View>

        {/* 세로 리스트 렌더 */}
        <View style={{ marginTop: 4 }}>
          {news.map((ev) => (
            <EventCard key={ev.id} event={ev} onPress={() => {
              // TODO: 상세 라우팅 연결
              console.log("[UI] news press", ev.id);
            }} />
          ))}
          {!news.length && (
            <View style={{ height: 120, borderRadius: 12, backgroundColor: placeholder, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: subText }}>최근 소식이 없습니다.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


