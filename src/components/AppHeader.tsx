import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { subscribeUnreadCount } from "../services/notifications";

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
  const [unread, setUnread] = useState<number>(0);
  useEffect(() => {
    const unsub = subscribeUnreadCount((c) => setUnread(c));
    return unsub;
  }, []);
  
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 8 }}>
      <Link href="/search" asChild>
        <Pressable accessibilityLabel="search">
          <Ionicons name="search-outline" color={iconColor} size={24} />
        </Pressable>
      </Link>
      <Link href="/notification" asChild>
        <Pressable accessibilityLabel="notifications" style={{ marginLeft: 18 }}>
          <View>
            <Ionicons name="notifications-outline" color={iconColor} size={24} />
            {unread > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -6,
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: "#FF3B30",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }} numberOfLines={1}>
                  {unread > 99 ? "99+" : String(unread)}
                </Text>
              </View>
            )}
          </View>
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


