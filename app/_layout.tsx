import React, { useEffect } from "react";
import { Tabs, Link } from "expo-router";
import { useColorScheme, Text, View, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "../src/state/queryClient";
import { setupAppFocus } from "../src/state/queryClient";
import { Ionicons } from "@expo/vector-icons";
import { AppHeaderRight, AppHeaderTitle } from "../src/components/AppHeader";

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
                headerTitle: () => (
                  <AppHeaderTitle color={colorScheme === "dark" ? "#fff" : "#125"} />
                ),
                headerTitleAlign: "left",
                headerRight: () => (
                  <AppHeaderRight iconColor={colorScheme === "dark" ? "#fff" : "#111"} />
                ),
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
                headerTitle: () => {
                  const headerColor = colorScheme === "dark" ? "#fff" : "#125";
                  return (
                    <Text style={[HEADER_TITLE_BASE_STYLE, { color: headerColor }]} numberOfLines={1}>
                      {HEADER_TITLE_TEXT}
                    </Text>
                  );
                },
                headerTitleAlign: "left",
                headerRight: () => {
                  const iconColor = colorScheme === "dark" ? "#fff" : "#111";
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
                      <Pressable accessibilityLabel="menu" style={{ marginLeft: 18 }}>
                        <Ionicons name="menu-outline" color={iconColor} size={24} />
                      </Pressable>
                    </View>
                  );
                },
              }}
            />
            {/* 탭은 3개만 노출: 나머지 라우트는 탭 바에서 숨김 */}
            <Tabs.Screen name="(modals)/filters" options={{ href: null }} />
            <Tabs.Screen name="chat/index" options={{ href: null }} />
            <Tabs.Screen name="events/index" options={{ href: null }} />
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
              name="search/index" 
              options={{ 
                href: null,
                headerShown: false 
              }} 
            />
            {/* 테스트 라우트 */}
            <Tabs.Screen
              name="test/local-image"
              options={{
                title: "",
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="image-outline" color={color} size={size} />
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