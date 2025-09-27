import React from "react";
import { View, Text, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export const HEADER_TITLE_TEXT = "JBSW NOW";
export const HEADER_TITLE_BASE_STYLE = {
  fontSize: 24,
  fontWeight: "800" as const,
};

export function AppHeaderTitle({ color, text = HEADER_TITLE_TEXT }: { color: string; text?: string }) {
  return (
    <Text style={[HEADER_TITLE_BASE_STYLE, { color }]} numberOfLines={1}>
      {text}
    </Text>
  );
}

export function AppHeaderRight({ iconColor }: { iconColor: string }) {
  const router = useRouter();
  
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 8 }}>
      <Link href="/search" asChild>
        <Pressable accessibilityLabel="search">
          <Ionicons name="search-outline" color={iconColor} size={24} />
        </Pressable>
      </Link>
      <Link href="/notification" asChild>
        <Pressable accessibilityLabel="notifications" style={{ marginLeft: 18 }}>
          <Ionicons name="notifications-outline" color={iconColor} size={24} />
        </Pressable>
      </Link>
      <Pressable 
        accessibilityLabel="menu" 
        style={{ marginLeft: 18 }}
        onPress={() => router.push("/settings")}
      >
        <Ionicons name="menu-outline" color={iconColor} size={24} />
      </Pressable>
    </View>
  );
}


