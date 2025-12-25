import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type FilterTag = "수강" | "학사" | "취업" | "공모전";

const FILTER_CONFIG: Record<FilterTag, { 
  label: string; 
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: { light: string; dark: string };
  iconColor: { light: string; dark: string };
}> = {
  "수강": {
    label: "수강",
    icon: "school",
    bgColor: { light: "#FFE0B2", dark: "rgba(255, 183, 77, 0.3)" },
    iconColor: { light: "#FF9800", dark: "#FFB74D" },
  },
  "학사": {
    label: "학사",
    icon: "library",
    bgColor: { light: "#C8E6C9", dark: "rgba(129, 199, 132, 0.3)" },
    iconColor: { light: "#66BB6A", dark: "#81C784" },
  },
  "취업": {
    label: "취업",
    icon: "briefcase",
    bgColor: { light: "#BBDEFB", dark: "rgba(100, 181, 246, 0.3)" },
    iconColor: { light: "#42A5F5", dark: "#64B5F6" },
  },
  "공모전": {
    label: "공모전",
    icon: "trophy",
    bgColor: { light: "#E1BEE7", dark: "rgba(186, 104, 200, 0.3)" },
    iconColor: { light: "#BA68C8", dark: "#CE93D8" },
  },
};

export default function WebQuickMenu() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const isSmallScreen = screenWidth < 768;

  const handleFilterPress = (filter: FilterTag) => {
    router.push(`/events?tag=${filter}`);
  };

  return (
    <View style={styles.container}>
      {Object.entries(FILTER_CONFIG).map(([filter, config]) => {
        const filterKey = filter as FilterTag;
        
        return (
          <FilterTagItem
            key={filterKey}
            filter={filterKey}
            config={config}
            isDark={isDark}
            isSmallScreen={isSmallScreen}
            onPress={() => handleFilterPress(filterKey)}
          />
        );
      })}
    </View>
  );
}

// 필터 태그 아이템 컴포넌트 (호버 애니메이션 포함)
const FilterTagItem = ({
  filter,
  config,
  isDark,
  isSmallScreen,
  onPress,
}: {
  filter: FilterTag;
  config: typeof FILTER_CONFIG[FilterTag];
  isDark: boolean;
  isSmallScreen: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // 웹 환경에서만 호버 효과 적용
  if (Platform.OS === "web") {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.menuItem,
          isSmallScreen && styles.menuItemSmall,
          {
            backgroundColor: isDark ? config.bgColor.dark : config.bgColor.light,
          },
        ]}
        onHoverIn={() => {
          scale.value = withTiming(1.1, { duration: 200 });
          rotation.value = withTiming(5, { duration: 200 });
        }}
        onHoverOut={() => {
          scale.value = withTiming(1, { duration: 200 });
          rotation.value = withTiming(0, { duration: 200 });
        }}
      >
        <Animated.View style={[
          styles.menuItemContent,
          isSmallScreen ? styles.menuItemContentSmall : styles.menuItemContentLarge,
          animatedStyle
        ]}>
          {isSmallScreen ? (
            <>
              <Ionicons
                name={config.icon}
                size={32}
                color={isDark ? config.iconColor.dark : config.iconColor.light}
              />
              <Text
                style={[
                  styles.label,
                  styles.labelSmall,
                  {
                    color: isDark ? config.iconColor.dark : config.iconColor.light,
                    fontWeight: "700",
                  }
                ]}
              >
                {config.label}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.label,
                  {
                    color: isDark ? config.iconColor.dark : config.iconColor.light,
                    fontWeight: "700",
                  }
                ]}
              >
                {config.label}
              </Text>
              <Ionicons
                name={config.icon}
                size={32}
                color={isDark ? config.iconColor.dark : config.iconColor.light}
              />
            </>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  // 모바일 환경에서는 호버 효과 없이 기본 동작
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuItem,
        isSmallScreen && styles.menuItemSmall,
        {
          backgroundColor: isDark ? config.bgColor.dark : config.bgColor.light,
        },
      ]}
    >
      {isSmallScreen ? (
        <>
          <Ionicons
            name={config.icon}
            size={32}
            color={isDark ? config.iconColor.dark : config.iconColor.light}
          />
          <Text
            style={[
              styles.label,
              styles.labelSmall,
              {
                color: isDark ? config.iconColor.dark : config.iconColor.light,
                fontWeight: "700",
              }
            ]}
          >
            {config.label}
          </Text>
        </>
      ) : (
        <>
          <Text
            style={[
              styles.label,
              {
                color: isDark ? config.iconColor.dark : config.iconColor.light,
                fontWeight: "700",
              }
            ]}
          >
            {config.label}
          </Text>
          <Ionicons
            name={config.icon}
            size={32}
            color={isDark ? config.iconColor.dark : config.iconColor.light}
          />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 16,
    maxWidth: 1400,
    alignSelf: "center",
    width: "100%",
  },
  menuItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    minHeight: 100,
    overflow: "hidden",
  },
  menuItemContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemContentSmall: {
    flexDirection: "column",
    gap: 8,
  },
  menuItemContentLarge: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  menuItemSmall: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 90,
    gap: 8,
  },
  label: {
    fontSize: 18,
    textAlign: "left",
    flex: 1,
  },
  labelSmall: {
    fontSize: 14,
    textAlign: "center",
    flex: 0,
  },
});

