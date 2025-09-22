import React from "react";
import { ActivityIndicator, View, Text, useColorScheme } from "react-native";

export const Loading = ({ label = "로딩 중..." }: { label?: string }) => {
  const scheme = useColorScheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <ActivityIndicator size="large" color={scheme === "dark" ? "#fff" : "#111"} />
      <Text style={{ marginTop: 12, color: scheme === "dark" ? "#eee" : "#333" }}>{label}</Text>
    </View>
  );
};

export default Loading;


