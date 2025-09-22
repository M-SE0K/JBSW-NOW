import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "../api/client";

export async function requestPushPermissionsAndToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    // 백엔드에 토큰 등록
    await api.post("/devices", { expoPushToken: token });
  } catch (e) {
    // TODO: 로깅/재시도 정책
  }

  return token;
}


