import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, Dimensions, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { subscribeUnreadCount } from "../services/notifications";
import { subscribeAuth, getCurrentUser } from "../services/auth";

const useScreenInfo = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  return {
    isDesktop: Platform.OS === "web" && dimensions.width >= 1024,
    isMobile: Platform.OS === "web" && dimensions.width < 768,
  };
};

export function AppHeaderLogo() {
  const screenInfo = useScreenInfo();
  const showText = !screenInfo.isMobile; // 모바일이 아닐 때만 텍스트 표시

  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoLetter}>J</Text>
      </View>
      {showText && (
        <View style={styles.logoTextContainer}>
          <Text style={styles.logoTextJBSW}>JBSW</Text>
          <Text style={styles.logoTextNOW}>NOW</Text>
        </View>
      )}
    </View>
  );
}

export function AppHeaderNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const screenInfo = useScreenInfo();
  const isActive = (route: string) => {
    if (route === "/") return pathname === "/" || pathname === "/index";
    return pathname?.startsWith(route);
  };

  const navItems = [
    { route: "/" as const, label: "홈", icon: "home-outline", activeIcon: "home" },
    { route: "/favorites" as const, label: "저장", icon: "bookmark-outline", activeIcon: "bookmark" },
    { route: "/hot" as const, label: "인기", icon: "flame-outline", activeIcon: "flame" },
  ];

  if (!screenInfo.isDesktop) {
    return null;
  }

  return (
    <View style={styles.navigationContainer}>
      {navItems.map((item) => {
        const active = isActive(item.route);
        return (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route as any)}
            style={[styles.navItem, active && styles.navItemActive]}
          >
            <Ionicons
              name={active ? (item.activeIcon as any) : (item.icon as any)}
              size={18}
              color={active ? "#4F46E5" : "#6B7280"}
            />
            <Text style={[styles.navText, active && styles.navTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppHeaderRight() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const screenInfo = useScreenInfo();
  const [unread, setUnread] = useState<number>(0);
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const unsubUnread = subscribeUnreadCount((c) => setUnread(c));
    const unsubAuth = subscribeAuth((u) => setUser(u));
    return () => {
      unsubUnread();
      unsubAuth();
    };
  }, []);

  return (
    <View style={styles.rightContainer}>
      {screenInfo.isDesktop && (
        <Pressable 
          style={[styles.aiBadge, { 
            backgroundColor: isDark ? "rgba(79, 70, 229, 0.2)" : "#EDE9FE",
            borderColor: isDark ? "rgba(79, 70, 229, 0.3)" : "#DDD6FE"
          }]}
        >
          <Ionicons name="sparkles" size={14} color="#4F46E5" />
          <Text style={[styles.aiBadgeText, { color: "#4F46E5" }]}>AI 분석 가동중</Text>
        </Pressable>
      )}

      <Pressable 
        style={styles.iconButton} 
        onPress={() => router.push("/search")}
        accessibilityLabel="search"
      >
        <Ionicons name="search-outline" color={isDark ? "#E5E7EB" : "#6B7280"} size={20} />
      </Pressable>

      <Pressable 
        style={styles.iconButton} 
        onPress={() => router.push("/notification")}
        accessibilityLabel="notifications"
      >
        <View style={{ position: "relative" }}>
          <Ionicons name="notifications-outline" color={isDark ? "#E5E7EB" : "#6B7280"} size={20} />
          {unread > 0 && (
            <View style={[
              styles.notificationDot,
              { borderColor: isDark ? "#111827" : "#fff" }
            ]} />
          )}
        </View>
      </Pressable>

      <Pressable 
        style={styles.iconButton} 
        onPress={() => router.push("/settings")}
        accessibilityLabel="menu"
      >
        <Ionicons name="menu-outline" color={isDark ? "#E5E7EB" : "#6B7280"} size={20} />
      </Pressable>

      {screenInfo.isDesktop && (
        <>
          {user ? (
            <Pressable 
              style={styles.loginButton}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="person-outline" size={16} color={isDark ? "#E5E7EB" : "#6B7280"} />
              <Text style={[styles.loginButtonText, { color: isDark ? "#E5E7EB" : "#6B7280" }]}>
                {user.email?.split("@")[0] || "사용자"}
              </Text>
            </Pressable>
          ) : (
            <Pressable 
              style={styles.loginButton}
              onPress={() => router.push("/auth/login")}
            >
              <Ionicons name="person-outline" size={16} color={isDark ? "#E5E7EB" : "#6B7280"} />
              <Text style={[styles.loginButtonText, { color: isDark ? "#E5E7EB" : "#6B7280" }]}>
                로그인
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoLetter: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  logoTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoTextJBSW: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  logoTextNOW: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4F46E5",
  },
  navigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    justifyContent: "center",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  navItemActive: {
    backgroundColor: "#F3F4F6",
  },
  navText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  navTextActive: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  iconButton: {
    padding: 4,
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
