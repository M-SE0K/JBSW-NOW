import React from "react";
import { View, Text, useColorScheme } from "react-native";

export const EmptyState = ({ title = "내용이 없습니다.", subtitle }: { title?: string; subtitle?: string }) => {
  const scheme = useColorScheme();
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: scheme === "dark" ? "#fff" : "#111" }}>{title}</Text>
      {subtitle ? (
        <Text style={{ marginTop: 8, color: scheme === "dark" ? "#bbb" : "#555", textAlign: "center" }}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

export default EmptyState;


