import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Switch, Button, TextInput, useColorScheme } from "react-native";
import { loadPreferences, savePreferences, Preferences } from "../../src/services/preferences";
import { requestPushPermissionsAndToken } from "../../src/services/notifications";

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [orgInput, setOrgInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await loadPreferences();
      setPrefs(p);
    })();
  }, []);

  const toggleNotifications = async (v: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, notificationsEnabled: v };
    setPrefs(next);
    await savePreferences(next);
  };

  const addOrg = async () => {
    if (!prefs) return;
    const id = orgInput.trim();
    if (!id) return;
    const next = { ...prefs, favoriteOrgIds: Array.from(new Set([...prefs.favoriteOrgIds, id])) };
    setPrefs(next);
    setOrgInput("");
    await savePreferences(next);
  };

  const addTag = async () => {
    if (!prefs) return;
    const tag = tagInput.trim();
    if (!tag) return;
    const next = { ...prefs, favoriteTags: Array.from(new Set([...prefs.favoriteTags, tag])) };
    setPrefs(next);
    setTagInput("");
    await savePreferences(next);
  };

  const registerPush = async () => {
    const t = await requestPushPermissionsAndToken();
    setPushToken(t);
  };

  if (!prefs) return null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: scheme === "dark" ? "#fff" : "#111", fontSize: 16, fontWeight: "600" }}>알림 허용</Text>
          <Switch value={prefs.notificationsEnabled} onValueChange={toggleNotifications} />
        </View>

        <View>
          <Text style={{ color: scheme === "dark" ? "#fff" : "#111", marginBottom: 8, fontWeight: "600" }}>관심 기관 추가</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput placeholder="orgId" value={orgInput} onChangeText={setOrgInput} style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
            <Button title="추가" onPress={addOrg} />
          </View>
          <Text style={{ marginTop: 6, color: scheme === "dark" ? "#bbb" : "#666" }}>{prefs.favoriteOrgIds.join(", ") || "없음"}</Text>
        </View>

        <View>
          <Text style={{ color: scheme === "dark" ? "#fff" : "#111", marginBottom: 8, fontWeight: "600" }}>관심 태그 추가</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput placeholder="tag" value={tagInput} onChangeText={setTagInput} style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
            <Button title="추가" onPress={addTag} />
          </View>
          <Text style={{ marginTop: 6, color: scheme === "dark" ? "#bbb" : "#666" }}>{prefs.favoriteTags.join(", ") || "없음"}</Text>
        </View>

        <View>
          <Button title="Expo Push 토큰 등록" onPress={registerPush} />
          {pushToken ? (
            <Text style={{ marginTop: 8, color: scheme === "dark" ? "#bbb" : "#666" }}>{pushToken}</Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}


