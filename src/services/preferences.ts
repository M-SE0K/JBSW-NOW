import * as SecureStore from "expo-secure-store";

const KEY_PREFS = "prefs_v1";

export type Preferences = {
  notificationsEnabled: boolean;
  favoriteOrgIds: string[];
  favoriteTags: string[];
};

const defaultPrefs: Preferences = {
  notificationsEnabled: false,
  favoriteOrgIds: [],
  favoriteTags: [],
};

export async function loadPreferences(): Promise<Preferences> {
  try {
    const v = await SecureStore.getItemAsync(KEY_PREFS);
    return v ? { ...defaultPrefs, ...(JSON.parse(v) as Preferences) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

export async function savePreferences(p: Preferences): Promise<void> {
  await SecureStore.setItemAsync(KEY_PREFS, JSON.stringify(p));
}


