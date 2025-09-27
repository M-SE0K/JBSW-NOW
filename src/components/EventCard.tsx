import React from "react";
import { View, Text, useColorScheme, TouchableOpacity, Linking } from "react-native";
import { cleanCrawledText } from "../utils/textCleaner";
import { Event } from "../types";
import { formatDateTime } from "../utils/date";

type Props = {
  event: Event;
  onPress?: () => void;
};

export const EventCard = ({ event, onPress }: Props) => {
  const scheme = useColorScheme();
  const openSource = () => {
    if (event.sourceUrl) Linking.openURL(event.sourceUrl);
  };
  // 타이틀 가공: JSON 규칙으로 생성된 제목이 없을 경우, 간단 정제
  const displayTitle = typeof event.title === "string" ? cleanCrawledText(event.title, { maxLength: 80 }) : event.title;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{
      backgroundColor: scheme === "dark" ? "#1c1c1c" : "#fff",
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: scheme === "dark" ? "#fff" : "#111" }}>{displayTitle}</Text>
      {event.summary ? (
        <Text numberOfLines={3} style={{ marginTop: 8, color: scheme === "dark" ? "#ddd" : "#444" }}>{event.summary}</Text>
      ) : null}

      <View style={{ marginTop: 10 }}>
        <Text style={{ color: scheme === "dark" ? "#bbb" : "#666" }}>
          {formatDateTime(event.startAt)}{event.endAt ? ` ~ ${formatDateTime(event.endAt)}` : ""}
        </Text>
        {event.location ? (
          <Text style={{ color: scheme === "dark" ? "#bbb" : "#666", marginTop: 2 }}>{event.location}</Text>
        ) : null}
      </View>

      {!!event.tags?.length && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          {event.tags!.map((t) => (
            <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: scheme === "dark" ? "#2a2a2a" : "#f1f1f1", borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: scheme === "dark" ? "#ddd" : "#333" }}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <Text style={{ color: scheme === "dark" ? "#aaa" : "#666" }}>{event.org?.name}</Text>
        {event.sourceUrl ? (
          <TouchableOpacity onPress={openSource}>
            <Text style={{ color: "#2f80ed", fontWeight: "600" }}>원문 보기</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default EventCard;


