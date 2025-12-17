import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Button, Linking, useColorScheme } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchEventById } from "../../src/api/events";
import Loading from "../../src/components/Loading";
import ErrorState from "../../src/components/ErrorState";
import { formatDateTime } from "../../src/utils/date";
import { incrementHotClick } from "../../src/services/hot";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const query = useQuery({ queryKey: ["event", id], queryFn: () => fetchEventById(id!) });

  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />;

  const e = query.data!;
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: scheme === "dark" ? "#fff" : "#111" }}>{e.title}</Text>
        {e.org?.name ? (
          <Text style={{ marginTop: 6, color: scheme === "dark" ? "#bbb" : "#666" }}>{e.org.name}</Text>
        ) : null}

        <View style={{ marginTop: 12 }}>
          <Text style={{ color: scheme === "dark" ? "#ddd" : "#444" }}>{formatDateTime(e.startAt)}{e.endAt ? ` ~ ${formatDateTime(e.endAt)}` : ""}</Text>
          {e.location ? <Text style={{ color: scheme === "dark" ? "#ddd" : "#444", marginTop: 4 }}>{e.location}</Text> : null}
        </View>

        {e.summary ? (
          <Text style={{ marginTop: 16, lineHeight: 22, color: scheme === "dark" ? "#eee" : "#333" }}>{e.summary}</Text>
        ) : null}

        {e.ai?.summary ? (
          <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: scheme === "dark" ? "#1f2937" : "#eef2ff" }}>
            <Text style={{ fontWeight: "700", marginBottom: 6, color: scheme === "dark" ? "#fff" : "#1e3a8a" }}>AI 요약</Text>
            <Text style={{ color: scheme === "dark" ? "#ddd" : "#333" }}>{e.ai.summary}</Text>
            {e.ai.recommendation ? (
              <Text style={{ marginTop: 8, color: scheme === "dark" ? "#ddd" : "#333" }}>추천: {e.ai.recommendation}</Text>
            ) : null}
          </View>
        ) : null}

        {e.tags?.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
            {e.tags.map((t) => (
              <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: scheme === "dark" ? "#2a2a2a" : "#f1f1f1", borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: scheme === "dark" ? "#ddd" : "#333" }}>#{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {e.sourceUrl ? (
          <View style={{ marginTop: 16 }}>
            <Button title="원문 링크 열기" onPress={async () => {
              try {
                // 인기글 카운트 증가 (실패해도 URL 열기는 계속 진행)
                try {
                  await incrementHotClick({ key: e.id, title: String(e.title || ""), sourceUrl: e.sourceUrl || null, posterImageUrl: e.posterImageUrl || null });
                } catch (hotError) {
                  console.warn("[UI] incrementHotClick error (non-blocking)", hotError);
                }
                await Linking.openURL(e.sourceUrl!);
              } catch (error) {
                console.warn("[UI] openURL error", error);
              }
            }} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}


