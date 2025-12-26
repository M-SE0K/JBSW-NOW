// 알림 리스트 화면
// - Firestore의 userNotifications 컬렉션에서 실시간으로 알림을 가져와 표시
// - 관심 태그와 매칭된 게시물에 대한 알림을 스택 형식으로 표시
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { 
  getUserNotifications, 
  subscribeUserNotifications, 
  markNotificationRead,
  markAllNotificationsRead,
  type UserNotification 
} from "../../src/services/userNotifications";
import { getCurrentUser } from "../../src/services/auth";
import { PageTransition } from "../../src/components/PageTransition";
import { usePageTransition } from "../../src/hooks/usePageTransition";

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isVisible, direction } = usePageTransition();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  const user = getCurrentUser();

  // Firestore에서 알림 실시간 구독
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // 초기 로드
    getUserNotifications(user.uid, 100).then((notifs) => {
      setNotifications(notifs);
      setReadNotifications(new Set(notifs.filter(n => n.read).map(n => n.id)));
      setLoading(false);
    });

    // 실시간 구독
    const unsubscribe = subscribeUserNotifications(
      user.uid,
      (notifs) => {
        setNotifications(notifs);
        setReadNotifications(new Set(notifs.filter(n => n.read).map(n => n.id)));
        setLoading(false);
      },
      100
    );

    return () => unsubscribe();
  }, [user]);

  const handleNotificationPress = async (notification: UserNotification) => {
    if (readNotifications.has(notification.id)) {
      return; // 이미 읽음
    }

    // 읽음 표시
    setReadNotifications(prev => new Set([...prev, notification.id]));
    await markNotificationRead(notification.id);

    // 이벤트 페이지로 이동 (있는 경우)
    if (notification.eventUrl) {
      // URL 열기 또는 이벤트 상세 페이지로 이동
      // router.push(`/events/${notification.eventId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  return (
    <PageTransition isVisible={isVisible} direction={direction}>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
        {/* 헤더 */}
        <View style={[styles.header, { backgroundColor: isDark ? "#000" : "#fff" }]}>
          <View style={styles.headerTop}>
            <Pressable 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color={isDark ? "#fff" : "#000"} />
            </Pressable>
            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <Pressable 
                  style={styles.markAllButton}
                  onPress={handleMarkAllRead}
                >
                  <Text style={[styles.markAllText, { color: isDark ? "#94A3B8" : "#666" }]}>
                    모두 읽음
                  </Text>
                </Pressable>
              )}
              <Pressable 
                style={styles.settingsButton}
                onPress={() => router.push("/notification/settings")}
              >
                <Ionicons name="settings-outline" size={24} color={isDark ? "#fff" : "#000"} />
              </Pressable>
            </View>
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>알림</Text>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 알림 목록 */}
        <View style={[styles.content, { backgroundColor: isDark ? "#111827" : "#fff" }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: isDark ? "#94A3B8" : "#666" }]}>
                불러오는 중...
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={isDark ? "#475569" : "#9CA3AF"} />
              <Text style={[styles.emptyText, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
                알림이 없습니다
              </Text>
              <Text style={[styles.emptySubtext, { color: isDark ? "#64748B" : "#9CA3AF" }]}>
                관심 태그를 설정하면 관련 게시물 알림을 받을 수 있습니다
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView}>
              {notifications.map((notification) => {
                const isRead = readNotifications.has(notification.id);
                return (
                  <Pressable
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      {
                        backgroundColor: isRead 
                          ? (isDark ? "#1E293B" : "#F9FAFB")
                          : (isDark ? "#334155" : "#FFFFFF"),
                        borderLeftWidth: isRead ? 0 : 4,
                        borderLeftColor: isRead ? "transparent" : "#6466E9",
                      }
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text 
                          style={[
                            styles.notificationTitle, 
                            { 
                              color: isDark ? "#F1F5F9" : "#111827",
                              fontWeight: isRead ? "500" : "700",
                            }
                          ]} 
                          numberOfLines={2}
                        >
                          {notification.eventTitle}
                        </Text>
                        {!isRead && (
                          <View style={[styles.unreadDot, { backgroundColor: "#6466E9" }]} />
                        )}
                      </View>
                      
                      {notification.matchedTags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {notification.matchedTags.slice(0, 3).map((tag) => (
                            <View 
                              key={tag} 
                              style={[
                                styles.tagBadge,
                                { backgroundColor: isDark ? "rgba(100, 102, 233, 0.2)" : "#EDE9FE" }
                              ]}
                            >
                              <Text style={[styles.tagText, { color: isDark ? "#A78BFA" : "#7C3AED" }]}>
                                #{tag}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      <Text style={[styles.notificationMeta, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
                        {formatNotificationTime(notification.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </PageTransition>
  );
}

function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR");
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  settingsButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  notificationItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  notificationMeta: {
    fontSize: 12,
  },
});