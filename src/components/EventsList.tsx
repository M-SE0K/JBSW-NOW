import React from "react";
import { View, Text } from "react-native";
import type { Event } from "../types";
import EventCard from "./EventCard";

type Props = {
  events: Event[];
  placeholderColor: string;
  emptyText?: string;
  onPressItem?: (event: Event) => void;
  style?: any;
};

export default function EventsList({ events, placeholderColor, emptyText = "최근 소식이 없습니다.", onPressItem, style }: Props) {
  return (
    <View style={[{ marginTop: 4 }, style]}>
      {events.map((ev) => (
        <EventCard key={ev.id} event={ev} onPress={() => onPressItem?.(ev)} />
      ))}
      {!events.length && (
        <View style={{ height: 120, borderRadius: 12, backgroundColor: placeholderColor, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#888" }}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}


