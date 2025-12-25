import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, Dimensions, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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
  const router = useRouter();
  const screenInfo = useScreenInfo();
  const showText = !screenInfo.isMobile; // 모바일이 아닐 때만 텍스트 표시

  const handleLogoPress = () => {
    if (Platform.OS === "web") {
      router.push("/");
    }
  };

  // 웹에서는 호버 효과 적용
  if (Platform.OS === "web") {
    const boxScale = useSharedValue(1);
    const textScale = useSharedValue(1);
    const boxRotation = useSharedValue(0);

    const boxAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: boxScale.value },
        { rotate: `${boxRotation.value}deg` },
      ],
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: textScale.value }],
    }));

    return (
      <Pressable
        style={[styles.logoContainer, { cursor: "pointer" } as any]}
        onPress={handleLogoPress}
        accessibilityRole="link"
        accessibilityLabel="홈으로 이동"
        onHoverIn={() => {
          boxScale.value = withTiming(1.1, { duration: 200 });
          textScale.value = withTiming(1.05, { duration: 200 });
          boxRotation.value = withTiming(5, { duration: 200 });
        }}
        onHoverOut={() => {
          boxScale.value = withTiming(1, { duration: 200 });
          textScale.value = withTiming(1, { duration: 200 });
          boxRotation.value = withTiming(0, { duration: 200 });
        }}
      >
        <Animated.View style={boxAnimatedStyle}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>J</Text>
          </View>
        </Animated.View>
        {showText && (
          <Animated.View style={[styles.logoTextContainer, textAnimatedStyle]}>
            <Text style={styles.logoTextJBSW}>JBSW</Text>
            <Text style={styles.logoTextNOW}>NOW</Text>
          </Animated.View>
        )}
      </Pressable>
    );
  }

  // 모바일에서는 호버 효과 없음
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

const NavItem = ({ item, active, onPress }: { 
  item: { route: string; label: string; icon: string; activeIcon: string };
  active: boolean;
  onPress: () => void;
}) => {
  const backgroundOpacity = useSharedValue(active ? 1 : 0);
  const scale = useSharedValue(1);

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.navItem}
      onHoverIn={() => {
        backgroundOpacity.value = withTiming(1, { duration: 200 });
        scale.value = withTiming(1.1, { duration: 200 });
      }}
      onHoverOut={() => {
        backgroundOpacity.value = withTiming(active ? 1 : 0, { duration: 200 });
        scale.value = withTiming(1, { duration: 200 });
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(100, 102, 233, 0.1)",
            borderRadius: 8,
          },
          backgroundAnimatedStyle,
        ]}
      />
      <Animated.View style={iconAnimatedStyle}>
        <Ionicons
          name={active ? (item.activeIcon as any) : (item.icon as any)}
          size={18}
          color={active ? "#6466E9" : "#6B7280"}
        />
      </Animated.View>
      <Text style={[
        styles.navText,
        active && styles.navTextActive,
      ]}>
        {item.label}
      </Text>
    </Pressable>
  );
};

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
    { route: "/events" as const, label: "소식", icon: "newspaper-outline", activeIcon: "newspaper" },
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
          <NavItem
            key={item.route}
            item={item}
            active={active}
            onPress={() => router.push(item.route as any)}
          />
        );
      })}
    </View>
  );
}

// 호버 효과가 있는 아이콘 버튼 컴포넌트
const IconButton = ({ 
  onPress, 
  iconName, 
  color, 
  size = 20,
  accessibilityLabel,
  children 
}: {
  onPress: () => void;
  iconName: string;
  color: string;
  size?: number;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundColor.value,
  }));

  if (Platform.OS !== 'web') {
    return (
      <Pressable onPress={onPress} style={styles.iconButton} accessibilityLabel={accessibilityLabel}>
        {children || <Ionicons name={iconName as any} color={color} size={size} />}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={styles.iconButton}
      accessibilityLabel={accessibilityLabel}
      onHoverIn={() => {
        scale.value = withTiming(1.15, { duration: 200 });
        backgroundColor.value = withTiming(1, { duration: 200 });
      }}
      onHoverOut={() => {
        scale.value = withTiming(1, { duration: 200 });
        backgroundColor.value = withTiming(0, { duration: 200 });
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(100, 102, 233, 0.1)",
            borderRadius: 8,
          },
          backgroundAnimatedStyle,
        ]}
      />
      <Animated.View style={animatedStyle}>
        {children || <Ionicons name={iconName as any} color={color} size={size} />}
      </Animated.View>
    </Pressable>
  );
};

// 호버 효과가 있는 로그인 버튼 컴포넌트
const LoginButton = ({
  onPress,
  iconName,
  text,
  color,
  isDark,
}: {
  onPress: () => void;
  iconName: string;
  text: string;
  color: string;
  isDark: boolean;
}) => {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundColor.value,
  }));

  if (Platform.OS !== 'web') {
    return (
      <Pressable style={styles.loginButton} onPress={onPress}>
        <Ionicons name={iconName as any} size={16} color={color} />
        <Text style={[styles.loginButtonText, { color }]}>{text}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.loginButton}
      onPress={onPress}
      onHoverIn={() => {
        scale.value = withTiming(1.05, { duration: 200 });
        backgroundColor.value = withTiming(1, { duration: 200 });
      }}
      onHoverOut={() => {
        scale.value = withTiming(1, { duration: 200 });
        backgroundColor.value = withTiming(0, { duration: 200 });
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? "rgba(100, 102, 233, 0.2)" : "rgba(100, 102, 233, 0.1)",
            borderRadius: 12,
          },
          backgroundAnimatedStyle,
        ]}
      />
      <Animated.View style={[styles.loginButtonContent, animatedStyle]}>
        <Ionicons name={iconName as any} size={16} color={color} />
        <Text style={[styles.loginButtonText, { color }]}>{text}</Text>
      </Animated.View>
    </Pressable>
  );
};

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
      <IconButton
        onPress={() => router.push("/search")}
        iconName="search-outline"
        color={isDark ? "#E5E7EB" : "#6B7280"}
        accessibilityLabel="search"
      />

      <IconButton
        onPress={() => router.push("/notification")}
        iconName="notifications-outline"
        color={isDark ? "#E5E7EB" : "#6B7280"}
        accessibilityLabel="notifications"
      >
        <View style={{ position: "relative", width: 20, height: 20 }}>
          <Ionicons name="notifications-outline" color={isDark ? "#E5E7EB" : "#6B7280"} size={20} />
          {unread > 0 && (
            <View style={[
              styles.notificationDot,
              { borderColor: isDark ? "#111827" : "#fff" }
            ]} />
          )}
        </View>
      </IconButton>

      <IconButton
        onPress={() => router.push("/settings")}
        iconName="menu-outline"
        color={isDark ? "#E5E7EB" : "#6B7280"}
        accessibilityLabel="menu"
      />

      {screenInfo.isDesktop && (
        <>
          {user ? (
            <LoginButton
              onPress={() => router.push("/settings")}
              iconName="person-outline"
              text={user.email?.split("@")[0] || "사용자"}
              color={isDark ? "#E5E7EB" : "#6B7280"}
              isDark={isDark}
            />
          ) : (
            <LoginButton
              onPress={() => router.push("/auth/login")}
              iconName="person-outline"
              text="로그인"
              color={isDark ? "#E5E7EB" : "#6B7280"}
              isDark={isDark}
            />
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
    backgroundColor: "#6466E9",
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
    color: "#6466E9",
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
    // position: 'relative', // Default in RN
  },
  navItemActive: {
    backgroundColor: "#F3F4F6", // Keep for mobile/fallback? But validation overwrites it with Moti.
    // Actually, if we use MotiView for bg, this style might conflict or double up.
    // I should remove this style usage in the render if relying on Moti.
    // But I kept `active && styles.navItemActive`?? No I removed it in my proposed code above.
  },
  navText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  navTextActive: {
    color: "#6466E9",
    fontWeight: "600",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  iconButton: {
    padding: 4,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  notificationDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    zIndex: 10,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  loginButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
