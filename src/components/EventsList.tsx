import React from "react";
import { View, Text, FlatList } from "react-native";
import type { Event } from "../types";
import EventCard from "./EventCard";

type Props = {
  events: Event[];
  placeholderColor: string;
  emptyText?: string;
  onPressItem?: (event: Event) => void;
  style?: any;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  extraData?: any;
};

export default function EventsList({ events, placeholderColor, emptyText = "최근 소식이 없습니다.", onPressItem, style, ListHeaderComponent, ListFooterComponent, refreshing, onRefresh, extraData }: Props) {
  const renderItem = ({ item }: { item: Event }) => (
    <EventCard event={item} onPress={() => onPressItem?.(item)} />
  );

  const renderEmptyComponent = () => (
    <View style={{ height: 120, borderRadius: 12, backgroundColor: placeholderColor, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#888" }}>{emptyText}</Text>
    </View>
  );

  return (
    <FlatList
      data={events}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmptyComponent}
      ListHeaderComponent={ListHeaderComponent as any}
      ListFooterComponent={ListFooterComponent as any}
      refreshing={refreshing}
      onRefresh={onRefresh}
      extraData={extraData}
    />
  );
}


