import React from "react";
import { StyleSheet, View, Pressable, useColorScheme, Platform } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ChatShortcutOverlay = () => {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const pathname = usePathname();

  // 웹에서만 표시 (모바일은 하단 탭바 사용)
  // 로그인/회원가입 페이지에서는 표시하지 않음
  if (
    Platform.OS !== "web" || 
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/auth/login") ||
    pathname?.startsWith("/auth/signup")
  ) {
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
            backgroundColor: "#6466E9",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6466E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ChatShortcutOverlay;

