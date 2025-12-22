import React from "react";
import { View, TouchableOpacity, StyleSheet, useColorScheme, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function FloatingChatButton() {
  const scheme = useColorScheme();
  const router = useRouter();
  const isDark = scheme === "dark";

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: isDark ? "#1F2937" : "#111827" }]}
      activeOpacity={0.8}
      onPress={() => router.push("/chat")}
    >
      <Ionicons name="sparkles" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    position: "absolute",
    bottom: 32,
    right: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
});

