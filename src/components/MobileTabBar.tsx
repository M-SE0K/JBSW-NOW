import React from "react";
import { View, Text, Pressable, StyleSheet, Appearance } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MobileTabBar(props: any) {
  const { state, descriptors, navigation } = props;
  const colorScheme = Appearance.getColorScheme();
  const isDark = colorScheme === "dark";

  const routes = state?.routes || [];
  const currentRoute = routes[state?.index]?.name || "";
  
  // 표시할 탭 정의 (route name 매핑)
  const tabs = [
    { routeName: "index", label: "홈", icon: "home-outline", activeIcon: "home" },
    { routeName: "events/index", label: "소식", icon: "newspaper-outline", activeIcon: "newspaper" },
    { routeName: "chat/index", label: "", icon: "sparkles", isCenter: true }, // 중앙 버튼
    { routeName: "favorites/index", label: "저장", icon: "bookmark-outline", activeIcon: "bookmark" },
    { routeName: "settings/index", label: "전체", icon: "menu-outline", activeIcon: "menu" },
  ];

  const isActive = (routeName: string) => {
    return currentRoute === routeName;
  };

  const handlePress = (routeName: string) => {
    const route = routes.find((r: any) => r.name === routeName);
    if (route) {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(routeName as any);
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#111827" : "#fff",
          borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
          paddingBottom: 8, // Safe area는 부모에서 처리됨
        },
      ]}
    >
      {tabs.map((tab, index) => {
        const active = isActive(tab.routeName);

        if (tab.isCenter) {
          // 중앙 큰 원형 버튼
          return (
            <View key={index} style={styles.centerButtonWrapper}>
              <Pressable
                onPress={() => handlePress(tab.routeName)}
                style={({ pressed }) => [
                  styles.centerButton,
                  {
                    backgroundColor: "#6366F1",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name={tab.icon as any} size={28} color="#FFD700" />
              </Pressable>
            </View>
          );
        }

        // 일반 탭 버튼
        return (
          <Pressable
            key={index}
            onPress={() => handlePress(tab.routeName)}
            style={styles.tabButton}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as any}
              size={24}
              color={active ? "#6366F1" : (isDark ? "#9CA3AF" : "#6B7280")}
            />
            {tab.label && (
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? "#6366F1" : (isDark ? "#9CA3AF" : "#6B7280"),
                    fontWeight: active ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 8,
    height: 64,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  centerButtonWrapper: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24, // 중앙 버튼을 위로 올림
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
