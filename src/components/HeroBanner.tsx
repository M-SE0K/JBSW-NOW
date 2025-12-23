import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HeroBanner() {
  const scheme = useColorScheme();
  const router = useRouter();
  const isDark = scheme === "dark";
  const isMobileDevice = Platform.OS !== "web";
  
  const universities = [
    { name: "전북", color: "#3B82F6", bgColor: "#DBEAFE" },
    { name: "군산", color: "#EAB308", bgColor: "#FEF3C7" },
    { name: "원광", color: "#22C55E", bgColor: "#D1FAE5" },
  ];

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDark ? "#1E1B4B" : "#312E81",
      minHeight: isMobileDevice ? SCREEN_WIDTH * 0.6 : SCREEN_HEIGHT * 0.5,
      paddingVertical: isMobileDevice ? 12 : 40,
      paddingHorizontal: isMobileDevice ? 16 : 24,
      marginBottom: isMobileDevice ? 16 : 32,
    }
  ];

  return (
    <View style={containerStyle}>
      <View style={[styles.decorativeCircle1, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)" }]} />
      <View style={[styles.decorativeCircle2, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.2)" }]} />
      
      <View style={styles.content}>
        <View style={[styles.badgeRow, { marginBottom: isMobileDevice ? 12 : 20 }]}>
          <View style={[
            styles.badge,
            {
              backgroundColor: "rgba(99, 102, 241, 0.3)",
              paddingHorizontal: isMobileDevice ? 10 : 14,
              paddingVertical: isMobileDevice ? 6 : 8,
              marginBottom: isMobileDevice ? 6 : 10,
            }
          ]}>
            <Text style={[styles.badgeText, { fontSize: isMobileDevice ? 12 : 17 }]}>전북권 3개 대학 통합 플랫폼</Text>
          </View>
          <View style={[styles.geminiBadge, { marginBottom: isMobileDevice ? 6 : 10 }]}>
            <Ionicons name="sparkles" size={isMobileDevice ? 14 : 18} color="#FCD34D" />
            <Text style={[styles.geminiText, { fontSize: isMobileDevice ? 12 : 17 }]}>Gemini Pro 분석 기반</Text>
          </View>
        </View>

        <Text style={[
          styles.title,
          {
            fontSize: isMobileDevice ? 24 : 52,
            lineHeight: isMobileDevice ? 32 : 68,
            marginBottom: isMobileDevice ? 12 : 20,
          }
        ]}>
          흩어진 정보를 한 곳에서,{'\n'}
          AI가 찾아주는 <Text style={styles.highlightText}>나만의 기회</Text>
        </Text>

        <Text style={[
          styles.description,
          {
            fontSize: isMobileDevice ? 13 : 22,
            lineHeight: isMobileDevice ? 18 : 32,
            marginBottom: isMobileDevice ? 16 : 28,
          }
        ]}>
          전북대·군산대·원광대 및 SW사업단의 핵심 소식을 수집하여{'\n'}
          Gemini가 분석한 맞춤형 요약 정보를 실시간으로 제공합니다.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              {
                paddingHorizontal: isMobileDevice ? 16 : 24,
                paddingVertical: isMobileDevice ? 10 : 14,
              }
            ]}
            activeOpacity={0.8}
            onPress={() => router.push("/settings")}
          >
            <Text style={[styles.primaryButtonText, { fontSize: isMobileDevice ? 14 : 19 }]}>맞춤 정보 설정</Text>
            <Ionicons name="arrow-forward" size={isMobileDevice ? 18 : 24} color="#1E1B4B" />
          </TouchableOpacity>

          <View style={styles.universityButtons}>
            {universities.map((univ, idx) => (
              <View 
                key={univ.name}
                style={[
                  styles.universityButton,
                  { 
                    backgroundColor: univ.bgColor,
                    marginLeft: idx > 0 ? -12 : 0,
                    borderColor: isDark ? "#4C1D95" : "#312E81",
                    width: isMobileDevice ? 36 : 42,
                    height: isMobileDevice ? 36 : 42,
                    borderRadius: isMobileDevice ? 18 : 21,
                  }
                ]}
              >
                <Text style={[
                  styles.universityText,
                  {
                    color: univ.color,
                    fontSize: isMobileDevice ? 9 : 11,
                  }
                ]}>
                  {univ.name}
                </Text>
              </View>
            ))}
            <View 
              style={[
                styles.universityButton,
                styles.addButton,
              { 
                backgroundColor: "#1F2937",
                marginLeft: -12,
                borderColor: isDark ? "#4C1D95" : "#312E81",
                width: isMobileDevice ? 36 : 42,
                height: isMobileDevice ? 36 : 42,
                borderRadius: isMobileDevice ? 18 : 21,
              }
              ]}
            >
              <Text style={[styles.addButtonText, { fontSize: isMobileDevice ? 14 : 16 }]}>+</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    marginTop: 16,
    width: "100%",
    justifyContent: "center",
  },
  decorativeCircle1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 384,
    height: 384,
    borderRadius: 192,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  content: {
    position: "relative",
    zIndex: 10,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    marginRight: 8,
  },
  badgeText: {
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.9)",
  },
  geminiBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  geminiText: {
    fontWeight: "600",
    color: "#FCD34D",
    marginLeft: 4,
  },
  title: {
    fontWeight: "800",
    color: "#fff",
  },
  highlightText: {
    color: "#FCD34D",
  },
  description: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontWeight: "700",
    color: "#1E1B4B",
    marginRight: 6,
  },
  universityButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  universityButton: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  universityText: {
    fontWeight: "800",
  },
  addButton: {
    backgroundColor: "#1F2937",
  },
  addButtonText: {
    fontWeight: "700",
    color: "#fff",
  },
});

