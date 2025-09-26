import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function NotificationsScreen() {
  const router = useRouter();
  const [selectedNotifications, setSelectedNotifications] = useState<Set<number>>(new Set());
  const [backgroundColors] = useState(() => 
    Array.from({ length: 7 }, () => new Animated.Value(0))
  );

  // 사진과 동일한 알림 데이터
  const notifications = [
    "이 알람은 민석이가 보내는 알람입니다.",
    "이 알람은 민석이가 보내는 알람입니다.",
    "이 알람은 민석이가 보내는 알람입니다.",
    "이 알람은 민석이가 보내는 알람입니다.",
    "이 알람은 민석이가 보내는 알람입니다.",
    "이 알람은 민석이가 보내는 알람입니다.",
    "이 알람은 민석이가 보내는 알람입니다.",
  ];

  const handleNotificationPress = (index: number) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedNotifications(newSelected);
    
    // 개별 알림의 회색에서 하얀색으로 배경 변경 애니메이션
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
          
          <Pressable style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#000" />
          </Pressable>
        </View>
        
        <Text style={styles.title}>알림</Text>
      </View>

      {/* 알림 목록 */}
      <View style={styles.content}>
        <ScrollView style={styles.scrollView}>
          {notifications.map((notification, index) => (
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
                <Text style={styles.notificationText}>{notification}</Text>
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
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginLeft: 12,
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
});
