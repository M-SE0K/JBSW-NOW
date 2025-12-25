import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type FilterTag = "수강" | "학사" | "취업" | "공모전";

type QuickMenuGridProps = {
  selectedFilter?: FilterTag | null;
  onFilterSelect?: (filter: FilterTag | null) => void;
};

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

export default function QuickMenuGrid({ selectedFilter, onFilterSelect }: QuickMenuGridProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isMobile = Platform.OS !== "web";

  const handleFilterPress = (filter: FilterTag) => {
    // 항상 선택된 필터를 전달 (events 페이지로 이동)
    onFilterSelect?.(filter);
  };

  return (
    <View style={styles.container}>
      {Object.entries(FILTER_CONFIG).map(([filter, config]) => {
        const filterKey = filter as FilterTag;
        
        return (
          <TouchableOpacity
            key={filterKey}
            style={styles.menuItem}
            onPress={() => handleFilterPress(filterKey)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark ? config.bgColor.dark : config.bgColor.light,
                }
              ]}
            >
              <Ionicons
                name={config.icon}
                size={isMobile ? 32 : 36}
                color={isDark ? config.iconColor.dark : config.iconColor.light}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: "#000000",
                  fontWeight: "600",
                }
              ]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
  },
  menuItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconBox: {
    width: "85%",
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    minWidth: 70,
    minHeight: 70,
  },
  label: {
    fontSize: 13,
    textAlign: "center",
    color: "#000000",
  },
});

