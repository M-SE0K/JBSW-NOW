import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "../src/state/queryClient";
import { setupAppFocus } from "../src/state/queryClient";
import { Ionicons } from "@expo/vector-icons";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setupAppFocus();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <Tabs
            screenOptions={{
              headerShown: true,
              tabBarActiveTintColor: colorScheme === "dark" ? "#fff" : "#111",
              tabBarStyle: { backgroundColor: colorScheme === "dark" ? "#111" : "#fff" },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "홈",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="home-outline" color={color} size={size} />
                ),
                headerTitle: "요약 피드",
              }}
            />
            <Tabs.Screen
              name="events/index"
              options={{
                title: "행사",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="calendar-outline" color={color} size={size} />
                ),
                headerTitle: "행사 목록",
              }}
            />
            <Tabs.Screen
              name="orgs/index"
              options={{
                title: "기관",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="business-outline" color={color} size={size} />
                ),
                headerTitle: "기관 목록",
              }}
            />
            <Tabs.Screen
              name="search/index"
              options={{
                title: "검색",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="search-outline" color={color} size={size} />
                ),
                headerTitle: "통합 검색",
              }}
            />
            <Tabs.Screen
              name="chat/index"
              options={{
                title: "챗봇",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
                ),
                headerTitle: "AI 챗봇",
              }}
            />
            <Tabs.Screen
              name="settings/index"
              options={{
                title: "설정",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="settings-outline" color={color} size={size} />
                ),
                headerTitle: "설정",
              }}
            />
            {/* 모달 라우트: 탭 외부에서 push로 열리며, 화면 자체에서 모달 스타일 처리 */}
            <Tabs.Screen
              name="(modals)/filters"
              options={{ href: null }}
            />
            <Tabs.Screen name="events/[id]" options={{ href: null }} />
            <Tabs.Screen name="orgs/[orgId]" options={{ href: null }} />
          </Tabs>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


