import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useColorScheme } from "react-native";

type University = "전체" | "전북대" | "군산대" | "원광대" | "SW사업단";

type Props = {
  selectedUniversity: University;
  onSelectUniversity: (univ: University) => void;
};

const universities: University[] = ["전체", "전북대", "군산대", "원광대", "SW사업단"];

export default function UniversityFilter({ selectedUniversity, onSelectUniversity }: Props) {
  const scheme = useColorScheme();
  const bgColor = scheme === "dark" ? "#1E293B" : "#FFFFFF";
  const activeBgColor = scheme === "dark" ? "#111827" : "#111827";
  const inactiveBgColor = scheme === "dark" ? "#334155" : "#FFFFFF";
  const activeTextColor = "#FFFFFF";
  const inactiveTextColor = scheme === "dark" ? "#94A3B8" : "#64748B";

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {universities.map((univ) => {
        const isSelected = univ === selectedUniversity;
        return (
          <TouchableOpacity
            key={univ}
            style={[
              styles.filterButton,
              {
                backgroundColor: isSelected ? activeBgColor : inactiveBgColor,
                borderColor: isSelected ? "transparent" : (scheme === "dark" ? "#475569" : "#E5E7EB"),
                marginRight: 8,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => onSelectUniversity(univ)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: isSelected ? activeTextColor : inactiveTextColor,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}
            >
              {univ}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

