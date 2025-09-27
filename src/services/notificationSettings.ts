// 알림 설정 타입 정의
export interface NotificationSettings {
  allNotifications: boolean;
  newNewsNotifications: boolean;
  popularNewsNotifications: boolean;
  favoritesNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  badgeNotifications: boolean;
  notificationTimeStart: string; // "09:00"
  notificationTimeEnd: string; // "22:00"
  doNotDisturbStart: string; // "23:00"
  doNotDisturbEnd: string; // "08:00"
}

// 기본 설정값
const DEFAULT_SETTINGS: NotificationSettings = {
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
};

const STORAGE_KEY = "notificationSettings";

// 설정 저장
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch (error) {
    console.error("알림 설정 저장 실패:", error);
  }
}

// 설정 불러오기
export function loadNotificationSettings(): NotificationSettings {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 기본값과 병합하여 누락된 설정이 있으면 기본값으로 채움
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (error) {
    console.error("알림 설정 불러오기 실패:", error);
  }
  
  return DEFAULT_SETTINGS;
}

// 특정 설정 업데이트
export function updateNotificationSetting<K extends keyof NotificationSettings>(
  key: K,
  value: NotificationSettings[K]
): NotificationSettings {
  const currentSettings = loadNotificationSettings();
  const newSettings = { ...currentSettings, [key]: value };
  saveNotificationSettings(newSettings);
  return newSettings;
}

// 설정 초기화
export function resetNotificationSettings(): NotificationSettings {
  saveNotificationSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

// 알림이 활성화되어 있는지 확인
export function isNotificationEnabled(): boolean {
  const settings = loadNotificationSettings();
  return settings.allNotifications;
}

// 특정 알림 타입이 활성화되어 있는지 확인
export function isNotificationTypeEnabled(type: keyof Pick<NotificationSettings, 
  'newNewsNotifications' | 'popularNewsNotifications' | 'favoritesNotifications'
>): boolean {
  const settings = loadNotificationSettings();
  return settings.allNotifications && settings[type];
}
