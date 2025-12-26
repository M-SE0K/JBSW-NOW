import React, { useState, useEffect, memo, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Alert, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hydrateFavorites, clearFavorites } from "../../src/services/favorites";
import { subscribeAuth, logout, getCurrentUser } from "../../src/services/auth";
import { User } from "firebase/auth";
import { PageTransition } from "../../src/components/PageTransition";
import { usePageTransition } from "../../src/hooks/usePageTransition";
import { 
  getInterestedTags, 
  toggleInterestedTag, 
  hydrateInterestedTags,
  subscribe as subscribeInterestedTags 
} from "../../src/services/interestedTags";
import { ALLOWED_TAGS, TAG_COLORS, type AllowedTag } from "../../src/services/tags";

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

const SettingsScreen = memo(() => {
  const router = useRouter();
  const { isVisible, direction } = usePageTransition();
  
  // 설정 상태
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [interestedTags, setInterestedTags] = useState<AllowedTag[]>([]);
  const [modalType, setModalType] = useState<"feedback" | "dev" | null>(null);

  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(modalAnim, {
      toValue: modalType ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [modalType, modalAnim]);

  useEffect(() => {
    const unsubscribe = subscribeAuth(setUser);
    return unsubscribe;
  }, []);

  // 관심 태그 로드 및 구독
  useEffect(() => {
    if (user) {
      hydrateInterestedTags();
      const unsubscribe = subscribeInterestedTags(() => {
        setInterestedTags(getInterestedTags());
      });
      setInterestedTags(getInterestedTags());
      return unsubscribe;
    } else {
      setInterestedTags([]);
    }
  }, [user]);

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
      style={[styles.settingItem, { backgroundColor: "#fff" }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: "#f0f0f0" }]}>
          <Ionicons name={icon as any} size={20} color="#666" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, { color: "#000" }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: "#666" }]}>{subtitle}</Text>}
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
          <Ionicons name="chevron-forward" size={20} color="#666" />
        )}
      </View>
    </Pressable>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={[styles.sectionHeader, { backgroundColor: "#f8f8f8" }]}>
      <Text style={[styles.sectionTitle, { color: "#666" }]}>{title}</Text>
    </View>
  );

  const renderModal = () => {
    if (!modalType) return null;
    const isFeedback = modalType === "feedback";

    return (
      <Pressable style={styles.modalOverlay} onPress={() => setModalType(null)}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: modalAnim,
              transform: [
                {
                  translateY: modalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.modalTitle}>{isFeedback ? "피드백 보내기" : "개발자 정보"}</Text>
          {isFeedback ? (
            <>
              <Text style={styles.modalText}>문의사항은 아래 이메일로 보내주세요.</Text>
              <Text style={styles.modalHighlight}>권민석 · seg7577@jbnu.ac.kr</Text>
            </>
          ) : (
            <>
              <Text style={styles.modalText}>권민석 · 전북대학교 컴퓨터공학부 3학년 재학</Text>
              <Text style={styles.modalHighlight}>seg7577@jbnu.ac.kr</Text>
              <Text style={styles.modalHighlight}>GitHub: https://github.com/https://github.com/M-SE0K/JBSW-NOW.git</Text>
            </>
          )}
          <Pressable style={styles.modalButton} onPress={() => setModalType(null)}>
            <Text style={styles.modalButtonText}>닫기</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <PageTransition isVisible={isVisible} direction={direction}>
      <SafeAreaView style={[styles.container, { backgroundColor: "#fff" }]}>
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: "#fff" }]}>
          <View style={styles.headerTop}>
            <Pressable 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#000" />
            </Pressable>
            
            <View style={styles.placeholder} />
          </View>

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: "#000" }]}>설정</Text>
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

        <SectionHeader title="관심 분야" />
        <View style={styles.tagsSection}>
          <Text style={[styles.tagsSectionTitle, { color: "#111827" }]}>
            관심 태그를 선택하면 관련 게시물 알림을 받을 수 있습니다
          </Text>
          <View style={styles.tagsContainer}>
            {ALLOWED_TAGS.map((tag) => {
              const isSelected = interestedTags.includes(tag);
              const tagColor = TAG_COLORS[tag] || TAG_COLORS["일반"];
              return (
                <Pressable
                  key={tag}
                  onPress={async () => {
                    try {
                      await toggleInterestedTag(tag);
                    } catch (e) {
                      console.error("[SETTINGS] Failed to toggle tag", e);
                    }
                  }}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isSelected ? "#6466E9" : tagColor.bg,
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: isSelected ? "transparent" : (tagColor.border || tagColor.text),
                    }
                  ]}
                >
                  <Text style={[
                    styles.tagChipText,
                    { 
                      color: isSelected ? "#FFFFFF" : tagColor.text
                    }
                  ]}>
                    {tag}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

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
              const user = getCurrentUser();
              if (user) {
                await clearFavorites();
                await hydrateFavorites();
                console.log("[SETTINGS] cleared favorites", { userId: user.uid });
              }
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
          onPress={() => setModalType("feedback")}
          showArrow={true}
        />
        <SettingItem
          title="개발자 정보"
          subtitle="JBSW NOW 개발팀"
          icon="people-outline"
          onPress={() => setModalType("dev")}
          showArrow={true}
        />
      </ScrollView>
      </SafeAreaView>
      {renderModal()}
    </PageTransition>
  );
});

SettingsScreen.displayName = "SettingsScreen";

export default SettingsScreen;

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
  tagsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tagsSectionTitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minHeight: 36,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },
  modalText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 6,
  },
  modalHighlight: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 6,
  },
  modalButton: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#6466E9",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
