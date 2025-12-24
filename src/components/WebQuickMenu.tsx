import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

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

  const handleFilterPress = (filter: FilterTag) => {
    router.push(`/events?tag=${filter}`);
  };

  return (
    <View style={styles.container}>
      {Object.entries(FILTER_CONFIG).map(([filter, config]) => {
        const filterKey = filter as FilterTag;
        
        return (
          <TouchableOpacity
            key={filterKey}
            style={[
              styles.menuItem,
              {
                backgroundColor: isDark ? config.bgColor.dark : config.bgColor.light,
              }
            ]}
            onPress={() => handleFilterPress(filterKey)}
            activeOpacity={0.8}
          >
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
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: "#FFFFFF",
                }
              ]}
            >
              <Ionicons
                name={config.icon}
                size={28}
                color={isDark ? config.iconColor.dark : config.iconColor.light}
              />
            </View>
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
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    fontSize: 18,
    textAlign: "left",
    flex: 1,
  },
});

