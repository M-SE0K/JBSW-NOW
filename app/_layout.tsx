import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { useColorScheme, View, StyleSheet, Dimensions, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "../src/state/queryClient";
import { setupNotificationHandler, startNoticesPolling, stopNoticesPolling, requestLocalNotificationPermission } from "../src/services/notifications";
import { setupAppFocus } from "../src/state/queryClient";
import { AppHeaderLogo, AppHeaderNavigation, AppHeaderRight } from "../src/components/AppHeader";
import ChatShortcutOverlay from "../src/components/ChatShortcutOverlay";

const HeaderComponent = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isDesktop = Platform.OS === "web" && dimensions.width >= 1024;

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        <AppHeaderLogo />
      </View>
      {isDesktop && (
        <View style={headerStyles.center}>
          <AppHeaderNavigation />
        </View>
      )}
      <View style={headerStyles.right}>
        <AppHeaderRight />
      </View>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 1280,
    marginLeft: "auto",
    marginRight: "auto",
    paddingHorizontal: 24,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexShrink: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  right: {
    flexShrink: 0,
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setupAppFocus();
    setupNotificationHandler();
    // 시뮬레이터/로컬 환경: 로컬 알림 권한만 요청
    requestLocalNotificationPermission();
    startNoticesPolling({ intervalMs: 5000_000, batch: 200 });
    return () => stopNoticesPolling();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <QueryProvider>
          <Tabs
            screenOptions={{
              headerShown: true,
              tabBarActiveTintColor: colorScheme === "dark" ? "#fff" : "#111",
              tabBarStyle: { display: "none" },
              headerStyle: {
                backgroundColor: colorScheme === "dark" ? "#111827" : "#fff",
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "",
                headerTitle: () => <HeaderComponent />,
                headerTitleAlign: "left",
              }}
            />

            <Tabs.Screen
              name="favorites/index"
              options={{
                title: "",
                headerTitle: () => <HeaderComponent />,
                headerTitleAlign: "left",
              }}
            />

            <Tabs.Screen
              name="hot/index"
              options={{
                title: "",
                headerTitle: () => <HeaderComponent />,
                headerTitleAlign: "left",
              }}
            />
            <Tabs.Screen
              name="auth/login"
              options={{
                href: null,
                headerShown: false,
                tabBarStyle: { display: "none" },
              }}
            />
            <Tabs.Screen
              name="auth/signup"
              options={{
                href: null,
                headerShown: false,
                tabBarStyle: { display: "none" },
              }}
            />
            <Tabs.Screen name="(modals)/filters" options={{ href: null }} />
            <Tabs.Screen
              name="chat/index"
              options={{
                href: null,
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="events/index"
              options={{
                href: null,
                headerShown: false,
              }}
            />
            <Tabs.Screen name="events/[id]" options={{ href: null }} />
            <Tabs.Screen name="orgs/index" options={{ href: null }} />
            <Tabs.Screen name="orgs/[orgId]" options={{ href: null }} />
            <Tabs.Screen
              name="notification/index"
              options={{
                href: null,
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="notification/settings"
              options={{
                href: null,
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="search/index"
              options={{
                href: null,
                headerShown: false,
              }}
            />
            <Tabs.Screen
              name="settings/index"
              options={{
                href: null,
                headerShown: false,
              }}
            />
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
        <ChatShortcutOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}