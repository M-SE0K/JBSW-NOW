import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, useColorScheme } from "react-native";

export default function Home() {
  const colorScheme = useColorScheme();
  const placeholder = colorScheme === "dark" ? "#2B2F33" : "#E4EAEE";
  const textColor = colorScheme === "dark" ? "#fff" : "#111";
  const subText = colorScheme === "dark" ? "#C8CDD2" : "#6B7280";

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
      >
        {/* 상단 배너 영역 */}
        <View style={{ height: 200, borderRadius: 14, backgroundColor: placeholder, marginTop: 12,overflow: "hidden" }} />

        {/* 페이지네이션 점 표시 */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 6 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                marginHorizontal: 4,
                backgroundColor: i === 0 ? subText : `${subText}55`,
              }}
            />
          ))}
        </View>

        {/* 섹션 헤더 */}
        <View style={{ marginTop: 20, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: textColor }}>새로운 소식</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>더보기 ▸</Text>
        </View>

        {/* 큰 콘텐츠 영역 */}
        <View style={{ height: 520, borderRadius: 14, backgroundColor: placeholder }} />
      </ScrollView>
    </SafeAreaView>
  );
}


