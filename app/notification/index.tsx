// 알림 리스트 화면
// - 저장된 로컬 알림(AsyncStorage의 localNotifications)을 읽어 요약 리스트로 표시
// - 앱 내에서 알림이 생성되면 구독을 통해 즉시 반영
// - 저장된 알림이 없을 때는 샘플 항목을 대신 렌더링하여 UI 구조를 확인할 수 있도록 함
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getLocalNotifications, subscribeLocalNotifications, clearLocalNotifications, type LocalNotificationItem } from "../../src/services/notifications";
import { testNotices } from "../../src/services/testNotices";

export default function NotificationsScreen() {
  const router = useRouter();
  const [selectedNotifications, setSelectedNotifications] = useState<Set<number>>(new Set());
  const [backgroundColors] = useState(() => 
    Array.from({ length: 7 }, () => new Animated.Value(0))
  );

  const [items, setItems] = useState<LocalNotificationItem[]>([]);

  // 샘플 데이터(스토리지 비어있을 때 UI 미리보기용)
  const sampleItems: LocalNotificationItem[] = [
    {
      id: "sample-1",
      title: "[공학대학] 2025년 하반기 해커톤 참가자 모집",
      body: "교내 해커톤 참가자를 모집합니다. 팀 매칭 및 사전 교육 제공, 우수팀 시상.",
      data: { url: "https://example.com/hackathon" },
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: "sample-2",
      title: "[취업진로지원과] 현직자 멘토링 프로그램 안내",
      body: "IT·SW 분야 현직자와의 1:1 멘토링. 신청 선착순 마감.",
      data: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "sample-3",
      title: "[컴퓨터공학부] 알고리즘 스터디 모집(초급/중급)",
      body: "백준 단계별/분류별 문제로 진행. 주 2회 오프라인 스터디.",
      data: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
  ];

  // 초기 로드 + 저장소 변경 구독
  useEffect(() => {
    let mounted = true;
    (async () => {
      // 테스트 데이터가 존재하면 테스트 데이터를 우선 사용
      const data = (Array.isArray(testNotices) && testNotices.length > 0)
        ? testNotices
        : await getLocalNotifications();
      if (mounted) setItems(data);
    })();
    const unsub = subscribeLocalNotifications(async () => {
      const data = (Array.isArray(testNotices) && testNotices.length > 0)
        ? testNotices
        : await getLocalNotifications();
      setItems(data);
    });
    return () => { mounted = false; unsub(); };
  }, []);

  const handleNotificationPress = (index: number) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedNotifications(newSelected);
    // 항목 탭 시 배경색 전환 애니메이션(회색 → 흰색)
    Animated.timing(backgroundColors[index], {
      toValue: newSelected.has(index) ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </Pressable>
          {/* 설정 화면으로 이동(알림 설정 등 확장 가능) */}
          <Pressable 
            style={styles.settingsButton}
            onPress={() => router.push("/notification/settings")}
          >
            <Ionicons name="settings-outline" size={24} color="#000" />
          </Pressable>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>알림</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </View>
      </View>

      {/* 알림 목록 */}
      <View style={styles.content}>
        {/* 비어있을 때는 샘플 안내 문구 노출(필요 시 주석 해제) */}
        {/* <View style={{ paddingHorizontal: 28, paddingTop: 10, paddingBottom: 6 }}>
          <Text style={{ fontSize: 12, color: "#888" }}>
            알림이 없어 샘플을 표시합니다.
          </Text>
        </View> */}

        <ScrollView style={styles.scrollView}>
          {(items.length ? items : sampleItems).map((n, index) => (
            <Animated.View
              key={index}
              style={[
                styles.notificationItem,
                {
                  backgroundColor: backgroundColors[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#f5f5f5', '#ffffff'],
                  }),
                }
              ]}
            >
              <Pressable 
                style={styles.notificationPressable}
                onPress={() => handleNotificationPress(index)}
              >
                {/* 제목/본문/수신 시각 요약 표시 */}
                <Text style={styles.notificationTitle} numberOfLines={2}>{n.title}</Text>
                {/* 본문은 알림 목록에서 렌더링하지 않음 */}
                <Text style={styles.notificationMeta}>{new Date(n.createdAt).toLocaleString()}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: "#fff",
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
  settingsButton: {
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
    color: "#000",
    marginRight: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
    paddingTop: 0,
  },
  notificationItem: {
    marginHorizontal: 0,
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f5f5f5",
  },
  notificationPressable: {
    paddingVertical: 24,
    paddingHorizontal: 0,
  },
  notificationText: {
    fontSize: 16,
    color: "#000",
    lineHeight: 24,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  notificationBody: {
    marginTop: 6,
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  notificationMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#888",
  },
});