import * as SecureStore from "expo-secure-store";

const KEY_ACTIVE_USER = "active_user_id_v1";
const KEY_FAV_PREFIX = "favorites_v1_"; // favorites_v1_{userId}

let activeUserId: string | null = null;
let inMemoryFavorites = new Set<string>();
let listeners = new Set<() => void>();

export async function ensureUserId(): Promise<string> {
  if (activeUserId) return activeUserId;
  let uid = await SecureStore.getItemAsync(KEY_ACTIVE_USER);
  if (!uid) {
    uid = generateUuid();
    await SecureStore.setItemAsync(KEY_ACTIVE_USER, uid);
    console.log("[FAV] create guest userId", uid);
  }
  activeUserId = uid;
  await hydrateFavorites();
  return uid;
}

export function getActiveUserIdSync(): string | null {
  return activeUserId;
}

export async function switchUser(userId: string): Promise<void> {
  activeUserId = userId;
  await SecureStore.setItemAsync(KEY_ACTIVE_USER, userId);
  await hydrateFavorites();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

export async function hydrateFavorites(): Promise<void> {
  const uid = activeUserId || (await ensureUserId());
  const key = KEY_FAV_PREFIX + uid;
  try {
    const raw = await SecureStore.getItemAsync(key);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    inMemoryFavorites = new Set(arr);
  } catch {
    inMemoryFavorites = new Set();
  }
  console.log("[FAV] hydrate", { userId: uid, count: inMemoryFavorites.size });
  notify();
}

export async function persistFavorites(): Promise<void> {
  if (!activeUserId) await ensureUserId();
  const key = KEY_FAV_PREFIX + activeUserId;
  await SecureStore.setItemAsync(key, JSON.stringify([...inMemoryFavorites]));
  console.log("[FAV] persist", { userId: activeUserId, count: inMemoryFavorites.size });
}

export function getFavorites(): string[] {
  return [...inMemoryFavorites];
}

export function isFavorite(id: string): boolean {
  return inMemoryFavorites.has(id);
}

export async function toggleFavorite(id: string): Promise<void> {
  const wasFav = inMemoryFavorites.has(id);
  if (wasFav) inMemoryFavorites.delete(id);
  else inMemoryFavorites.add(id);
  await persistFavorites();
  console.log("[FAV] toggle", { userId: activeUserId, id, added: !wasFav, total: inMemoryFavorites.size });
  notify();
}

function generateUuid(): string {
  // 간단한 UUIDv4 대용
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


