import React, { useEffect, useState } from "react";
import { Tabs, usePathname, useRouter, useSegments } from "expo-router";
import { useColorScheme, View, StyleSheet, Dimensions, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { QueryProvider } from "../src/state/queryClient";
import { setupNotificationHandler, startNoticesPolling, stopNoticesPolling, requestLocalNotificationPermission } from "../src/services/notifications";
import { setupAppFocus } from "../src/state/queryClient";
import { AppHeaderLogo, AppHeaderNavigation, AppHeaderRight } from "../src/components/AppHeader";
import ChatShortcutOverlay from "../src/components/ChatShortcutOverlay";
import MobileTabBar from "../src/components/MobileTabBar";
import { AnimatedTabBarButton } from "../src/components/AnimatedTabBarButton";
import { getCurrentUser, subscribeAuth } from "../src/services/auth";
import { User } from "firebase/auth";

const HeaderComponent = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isDesktop = Platform.OS === "web" && dimensions.width >= 1024;
  const isMobile = Platform.OS !== "web";

  // 모바일에서는 로고와 오른쪽 아이콘들 표시
  if (isMobile) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    return (
      <View style={[
        headerStyles.container, 
        headerStyles.mobileHeader, 
        { 
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
        }
      ]}>
        <AppHeaderLogo />
        <AppHeaderRight />
      </View>
    );
  }

  // 웹에서는 전체 헤더 표시
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

const CustomHeader = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? "#111827" : "#fff";

  const headerContent = <HeaderComponent />;

  // 웹에서는 SafeAreaView 불필요, 모바일에서는 SafeAreaView 사용
  if (Platform.OS === "web") {
    return (
      <View style={{ backgroundColor }}>
        {headerContent}
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor }}>
      {headerContent}
    </SafeAreaView>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 24,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileHeader: {
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  right: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});

// 인증이 필요 없는 경로 목록 (로그인/회원가입 페이지만 제외)
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 인증 상태 구독
  useEffect(() => {
    const unsubscribe = subscribeAuth((authUser) => {
      setUser(authUser);
      setIsCheckingAuth(false);
    });
    return unsubscribe;
  }, []);

  // 인증 보호 로직 - 모든 페이지를 보호하되, 인증 페이지만 제외
  useEffect(() => {
    if (isCheckingAuth) return;

    const currentPath = pathname || "/";
    const isPublicRoute = PUBLIC_ROUTES.some(route => currentPath.startsWith(route));

    // 공개 경로가 아니고 로그인하지 않은 경우 모든 페이지를 보호
    if (!isPublicRoute && !user) {
      // 원래 가려던 경로를 저장하고 로그인 페이지로 리다이렉트
      const redirectPath = encodeURIComponent(currentPath);
      const loginPath = redirectPath !== "/" 
        ? `/auth/login?redirect=${redirectPath}` as any
        : "/auth/login" as any;
      router.replace(loginPath);
    }
  }, [pathname, user, isCheckingAuth, router]);

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
            tabBar={Platform.OS === "web" ? undefined : MobileTabBar}
            screenOptions={{
              header: () => <CustomHeader />,
              // 웹에서는 항상 헤더 표시
              headerShown: Platform.OS === "web" ? true : undefined,
              tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
              tabBarActiveTintColor: colorScheme === "dark" ? "#fff" : "#111",
              tabBarStyle: Platform.OS === "web" ? { display: "none" } : { 
                display: "flex", 
                backgroundColor: colorScheme === "dark" ? "#0F172A" : "#F9FAFB",
                borderTopWidth: 0, 
                elevation: 0,
                shadowOpacity: 0,
                paddingTop: 0,
                paddingBottom: 0,
                marginTop: 0,
                marginBottom: 0,
                height: 60,
              },
              tabBarBackground: () => <View style={{ backgroundColor: colorScheme === "dark" ? "#0F172A" : "#F9FAFB", flex: 1 }} />,
              // 기본 애니메이션 비활성화 (커스텀 애니메이션 사용)
              animation: "none",
            }}
          >
            <Tabs.Screen
              name="index"
              options={{}}
            />

            <Tabs.Screen
              name="favorites/index"
              options={{
                headerShown: Platform.OS === "web",
              }}
            />

            <Tabs.Screen
              name="hot/index"
              options={{
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen
              name="auth/login"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
                tabBarStyle: { display: "none" },
              }}
            />
            <Tabs.Screen
              name="auth/signup"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
                tabBarStyle: { display: "none" },
              }}
            />
            <Tabs.Screen name="(modals)/filters" options={{ href: null }} />
            <Tabs.Screen
              name="chat/index"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen
              name="events/index"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen name="events/[id]" options={{ href: null }} />
            <Tabs.Screen name="orgs/index" options={{ href: null }} />
            <Tabs.Screen name="orgs/[orgId]" options={{ href: null }} />
            <Tabs.Screen
              name="notification/index"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen
              name="notification/settings"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen
              name="search/index"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen
              name="settings/index"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen
              name="test/local-image"
              options={{
                href: null,
                headerShown: Platform.OS === "web",
              }}
            />
            <Tabs.Screen name="test/firebase" options={{ href: null }} />
          </Tabs>
        </QueryProvider>
        {Platform.OS === "web" && <ChatShortcutOverlay />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}