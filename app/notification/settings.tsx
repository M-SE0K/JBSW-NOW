import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { 
  loadNotificationSettings, 
  saveNotificationSettings, 
  type NotificationSettings 
} from "../../src/services/notificationSettings";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  
  // 알림 설정 상태
  const [settings, setSettings] = useState<NotificationSettings>({
    allNotifications: true,
    newNewsNotifications: true,
    popularNewsNotifications: true,
    favoritesNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    badgeNotifications: true,
    notificationTimeStart: "09:00",
    notificationTimeEnd: "22:00",
    doNotDisturbStart: "23:00",
    doNotDisturbEnd: "08:00",
  });

  // 스위치 애니메이션 방지를 위한 ref
  const isUpdatingAllNotifications = useRef(false);
  const [displaySettings, setDisplaySettings] = useState<NotificationSettings>({
    allNotifications: true,
    newNewsNotifications: true,
    popularNewsNotifications: true,
    favoritesNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    badgeNotifications: true,
    notificationTimeStart: "09:00",
    notificationTimeEnd: "22:00",
    doNotDisturbStart: "23:00",
    doNotDisturbEnd: "08:00",
  });

  // 설정 불러오기
  useEffect(() => {
    const loadedSettings = loadNotificationSettings();
    setSettings(loadedSettings);
    setDisplaySettings(loadedSettings);
  }, []);

  // 설정 업데이트 함수
  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    let newSettings = { ...settings, [key]: value };
    
    // 전체 알림이 켜지면 모든 하위 알림도 켜짐
    if (key === 'allNotifications' && value) {
      newSettings = {
        ...newSettings,
        newNewsNotifications: true,
        popularNewsNotifications: true,
        favoritesNotifications: true,
      };
      setDisplaySettings(newSettings);
    }
    // 전체 알림이 꺼지면 하위 알림들의 실제 값은 유지 (스위치는 ON 상태 유지)
    // 실제 동작은 비활성화되어 OFF처럼 동작
    else if (key === 'allNotifications' && !value) {
      // 하위 항목들의 display 값을 현재 값으로 유지
      setDisplaySettings({
        ...newSettings,
        newNewsNotifications: settings.newNewsNotifications,
        popularNewsNotifications: settings.popularNewsNotifications,
        favoritesNotifications: settings.favoritesNotifications,
      });
    }
    // 일반적인 설정 변경
    else {
      setDisplaySettings(newSettings);
    }
    
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const SettingItem = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon,
    disabled = false
  }: {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
    disabled?: boolean;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon as any} size={20} color="#666" />
          </View>
        )}
        <View style={[styles.textContainer, !icon && styles.textContainerNoIcon]}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e0e0e0", true: "#007AFF" }}
        thumbColor={value ? "#fff" : "#f4f3f4"}
        disabled={disabled}
        style={{
          opacity: isUpdatingAllNotifications.current ? 0.7 : 1,
        }}
      />
    </View>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

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
          
          <Text style={styles.headerTitle}>알림 설정</Text>
          
          <View style={styles.placeholder} />
        </View>
      </View>

      {/* 설정 목록 */}
      <ScrollView style={styles.content}>
        <SectionHeader title="기본 알림" />
        <SettingItem
          title="전체 알림"
          subtitle="모든 알림을 켜거나 끕니다"
          value={displaySettings.allNotifications}
          onValueChange={(value) => updateSetting('allNotifications', value)}
          icon="notifications-outline"
        />
        
        {/* 하위 알림 항목들 - 전체 알림이 켜져 있을 때만 활성화 */}
        <View style={[styles.subSettingsContainer, { opacity: displaySettings.allNotifications ? 1 : 0.5 }]}>
          {/* 세로선 */}
          <View style={styles.verticalLine} />
          
          <View style={styles.subSettingItem}>
            <SettingItem
              title="새로운 소식 알림"
              subtitle="새로운 포스트가 올라올 때 알림"
              value={displaySettings.newNewsNotifications}
              onValueChange={(value) => updateSetting('newNewsNotifications', value)}
              icon=""
              disabled={!displaySettings.allNotifications}
            />
          </View>
          
          <View style={styles.subSettingItem}>
            <SettingItem
              title="인기 소식 알림"
              subtitle="인기 글이 올라올 때 알림"
              value={displaySettings.popularNewsNotifications}
              onValueChange={(value) => updateSetting('popularNewsNotifications', value)}
              icon=""
              disabled={!displaySettings.allNotifications}
            />
          </View>
          
          <View style={styles.subSettingItem}>
            <SettingItem
              title="즐겨찾기 알림"
              subtitle="즐겨찾기한 소식 업데이트 알림"
              value={displaySettings.favoritesNotifications}
              onValueChange={(value) => updateSetting('favoritesNotifications', value)}
              icon=""
              disabled={!displaySettings.allNotifications}
            />
          </View>
        </View>

      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f8f8",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  subSettingsContainer: {
    marginLeft: 16,
    paddingLeft: 16,
    marginTop: -1, // 상단 구분선과 연결
    position: 'relative',
  },
  verticalLine: {
    position: 'absolute',
    left: 24, // 세로선을 오른쪽으로 이동
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  subSettingItem: {
    marginLeft: 12, // 텍스트를 2만 오른쪽으로 이동
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
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  textContainerNoIcon: {
    marginLeft: 0,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#666",
  },
});
