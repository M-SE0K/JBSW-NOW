import React, { useEffect } from "react";
import { Tabs, Link } from "expo-router";
import { useColorScheme, Text, View, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "../src/state/queryClient";
import { setupNotificationHandler, startNoticesPolling, stopNoticesPolling, requestLocalNotificationPermission } from "../src/services/notifications";
import { setupAppFocus } from "../src/state/queryClient";
import { Ionicons } from "@expo/vector-icons";
import { AppHeaderRight, AppHeaderTitle } from "../src/components/AppHeader";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setupAppFocus();
    setupNotificationHandler();
    // 시뮬레이터/로컬 환경: 로컬 알림 권한만 요청
    requestLocalNotificationPermission();
    startNoticesPolling({ intervalMs: 5000_000, batch: 10 });
    return () => stopNoticesPolling();
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
            /* 헤더 영역 */
            <Tabs.Screen
              name="index"
              options={{
                title: "",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="home-outline" color={color} size={size} />
                ),
                headerTitle: () => (
                  <AppHeaderTitle color={colorScheme === "dark" ? "#fff" : "#125"} />
                ),
                headerTitleAlign: "left",
                headerRight: () => (
                  <AppHeaderRight iconColor={colorScheme === "dark" ? "#fff" : "#111"} />
                ),
              }}
            />
            
            /* 즐겨찾기 */
            <Tabs.Screen
              name="favorites/index"
              options={{
                title: "",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="bookmark-outline" color={color} size={size} />
                ),
                headerShown: false,
              }}
            />

            /* 인기 게시물 */
            <Tabs.Screen
              name="hot/index"
              options={{
                title: "",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="flame-outline" color={color} size={size} />
                ),
                headerShown: false,
              }}
            />
            {/* 탭은 3개만 노출: 나머지 라우트는 탭 바에서 숨김 */}
            <Tabs.Screen name="(modals)/filters" options={{ href: null }} />
            <Tabs.Screen name="chat/index" options={{ href: null }} />
            <Tabs.Screen 
              name="events/index" 
              options={{ 
                href: null,
                headerShown: false 
              }} 
            />
            <Tabs.Screen name="events/[id]" options={{ href: null }} />
            <Tabs.Screen name="orgs/index" options={{ href: null }} />
            <Tabs.Screen name="orgs/[orgId]" options={{ href: null }} />
            <Tabs.Screen 
              name="notification/index" 
              options={{ 
                href: null,
                headerShown: false 
              }} 
            />
            <Tabs.Screen 
              name="notification/settings" 
              options={{ 
                href: null,
                headerShown: false 
              }} 
            />
                   <Tabs.Screen 
                     name="search/index" 
                     options={{ 
                       href: null,
                       headerShown: false 
                     }} 
                   />
                   <Tabs.Screen 
                     name="settings/index" 
                     options={{ 
                       href: null,
                       headerShown: false 
                     }} 
                   />
            {/* 테스트 라우트 */}
            <Tabs.Screen
              name="test/local-image"
              options={{
                href: null,
                headerShown: false,
              }}
            />
            <Tabs.Screen name="test/firebase" options={{ href: null }} />
          </Tabs>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


/* 헤더 타이틀 커스터마이즈를 위한 기본 스타일과 텍스트 상수 */
const HEADER_TITLE_TEXT = "JBSW NOW";
const HEADER_TITLE_BASE_STYLE = {
  fontSize: 24,
  fontWeight: "800" as const,
};