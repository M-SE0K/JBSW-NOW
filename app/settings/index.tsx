import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureUserId, getActiveUserIdSync, hydrateFavorites, clearFavorites } from "../../src/services/favorites";
import { subscribeAuth, logout, getCurrentUser } from "../../src/services/auth";
import { User } from "firebase/auth";

// 플랫폼별 Alert 함수
const showAlert = (
  title: string,
  message: string,
  buttons?: Array<{
    text: string;
    style?: "cancel" | "default" | "destructive";
    onPress?: () => void;
  }>
) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      // 확인/취소 버튼이 있는 경우
      const confirmButton = buttons.find(b => b.style === 'destructive' || b.text !== '취소');
      if (window.confirm(`${title}\n\n${message}`)) {
        confirmButton?.onPress?.();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  // 설정 상태
  const [darkMode, setDarkMode] = useState(colorScheme === "dark");
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [user, setUser] = useState<User | null>(getCurrentUser());

  useEffect(() => {
    return subscribeAuth(setUser);
  }, []);

  const SettingItem = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon,
    onPress,
    showArrow = false
  }: {
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    icon: string;
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <Pressable 
      style={[styles.settingItem, { backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#fff" }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colorScheme === "dark" ? "#333" : "#f0f0f0" }]}>
          <Ionicons name={icon as any} size={20} color={colorScheme === "dark" ? "#fff" : "#666"} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, { color: colorScheme === "dark" ? "#fff" : "#000" }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: colorScheme === "dark" ? "#999" : "#666" }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {onValueChange && (
          <Switch
            value={value || false}
            onValueChange={onValueChange}
            trackColor={{ false: "#e0e0e0", true: "#007AFF" }}
            thumbColor={value ? "#fff" : "#f4f3f4"}
          />
        )}
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={colorScheme === "dark" ? "#999" : "#666"} />
        )}
      </View>
    </Pressable>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colorScheme === "dark" ? "#111" : "#f8f8f8" }]}>
      <Text style={[styles.sectionTitle, { color: colorScheme === "dark" ? "#999" : "#666" }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorScheme === "dark" ? "#000" : "#fff" }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colorScheme === "dark" ? "#000" : "#fff" }]}>
        <View style={styles.headerTop}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={colorScheme === "dark" ? "#fff" : "#000"} />
          </Pressable>
          
          <View style={styles.placeholder} />
        </View>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colorScheme === "dark" ? "#fff" : "#000" }]}>설정</Text>
        </View>
      </View>

      {/* 설정 목록 */}
      <ScrollView style={styles.content}>
        <SectionHeader title="계정" />
        {user ? (
          <SettingItem
            title="로그아웃"
            subtitle={user.email || "로그인됨"}
            icon="log-out-outline"
            onPress={() => {
              showAlert("로그아웃", "정말 로그아웃 하시겠습니까?", [
                { text: "취소", style: "cancel" },
                { 
                  text: "로그아웃", 
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await logout();
                      showAlert("알림", "로그아웃 되었습니다.");
                    } catch (e) {
                      showAlert("오류", "로그아웃 중 문제가 발생했습니다.");
                    }
                  }
                }
              ]);
            }}
            showArrow={false}
          />
        ) : (
          <SettingItem
            title="로그인 / 회원가입"
            subtitle="더 많은 기능을 이용해보세요"
            icon="log-in-outline"
            onPress={() => router.push("/auth/login")}
            showArrow={true}
          />
        )}

        <SectionHeader title="일반" />
        <SettingItem
          title="다크 모드"
          subtitle="어두운 테마 사용"
          value={darkMode}
          onValueChange={setDarkMode}
          icon="moon-outline"
        />
        <SettingItem
          title="자동 새로고침"
          subtitle="앱 실행 시 자동으로 새 소식 불러오기"
          value={autoRefresh}
          onValueChange={setAutoRefresh}
          icon="refresh-outline"
        />

        <SectionHeader title="알림" />
        <SettingItem
          title="알림 설정"
          subtitle="푸시 알림 및 알림 시간 설정"
          icon="notifications-outline"
          onPress={() => router.push("/notification/settings")}
          showArrow={true}
        />

        <SectionHeader title="데이터 관리" />
        <SettingItem
          title="캐시 삭제"
          subtitle="저장된 데이터 초기화"
          icon="trash-outline"
          onPress={async () => {
            try {
              // 최근 검색어 삭제
              const recentKey = "recentSearches";
              const recentBeforeRaw = await AsyncStorage.getItem(recentKey);
              const recentBefore = recentBeforeRaw ? (JSON.parse(recentBeforeRaw) as string[]) : [];
              await AsyncStorage.removeItem(recentKey);
              console.log("[SETTINGS] cleared recent searches", { before: recentBefore.length, after: 0, items: recentBefore });

              // 즐겨찾기 삭제(현재 사용자)
              await ensureUserId();
              const uid = getActiveUserIdSync();
              await clearFavorites();
                await hydrateFavorites();
              console.log("[SETTINGS] cleared favorites", { userId: uid });
              showAlert("완료", "캐시 데이터가 삭제되었습니다.");
            } catch (e) {
              console.warn("[SETTINGS] clear cache error", e);
              showAlert("오류", "캐시 삭제 중 문제가 발생했습니다.");
            }
          }}
          showArrow={true}
        />

        <SectionHeader title="정보" />
        <SettingItem
          title="앱 정보"
          subtitle="버전 1.0.0"
          icon="information-circle-outline"
          onPress={() => {
            // TODO: 앱 정보 모달 표시
            console.log("앱 정보");
          }}
          showArrow={true}
        />
        <SettingItem
          title="피드백 보내기"
          subtitle="버그 리포트 및 개선 제안"
          icon="mail-outline"
          onPress={() => {
            // TODO: 피드백 모달 표시
            console.log("피드백");
          }}
          showArrow={true}
        />
        <SettingItem
          title="개발자 정보"
          subtitle="JBSW NOW 개발팀"
          icon="people-outline"
          onPress={() => {
            // TODO: 개발자 정보 모달 표시
            console.log("개발자 정보");
          }}
          showArrow={true}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 24,
    height: 24,
    padding: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 4,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
