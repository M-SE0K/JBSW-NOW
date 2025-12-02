import React from "react";
import { StyleSheet, View, Pressable, useColorScheme } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ChatShortcutOverlay = () => {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const pathname = usePathname();

  if (pathname?.startsWith("/chat")) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, styles.overlay]}>
      <Pressable
        accessibilityLabel="챗봇 열기"
        accessibilityHint="챗봇 화면으로 이동"
        onPress={() => router.push("/chat")}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: insets.bottom + 32,
            backgroundColor: isDark ? "#1f1f1f" : "#111111",
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={26} color="#ffffff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 99,
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default ChatShortcutOverlay;

