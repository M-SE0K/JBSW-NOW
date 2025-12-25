import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../db/firebase";

const KEY_ACTIVE_USER = "active_user_id_v1";
const KEY_FAV_PREFIX = "favorites_v1_"; // favorites_v1_{userId}

let activeUserId: string | null = null;
let inMemoryFavorites = new Set<string>();
let listeners = new Set<() => void>();

// 플랫폼별 스토리지 추상화
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    if (Platform.OS === 'web') {
      // SSR 환경에서는 null 반환
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
      return;
    }
    if (Platform.OS === 'web') {
      // SSR 환경에서는 무시
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
      return;
    }
    if (Platform.OS === 'web') {
      // SSR 환경에서는 무시
      return;
    }
    await AsyncStorage.removeItem(key);
  }
};

export async function ensureUserId(): Promise<string> {
  if (activeUserId) return activeUserId;
  let uid = await storage.getItem(KEY_ACTIVE_USER);
  if (!uid) {
    uid = generateUuid();
    await storage.setItem(KEY_ACTIVE_USER, uid);
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
  await storage.setItem(KEY_ACTIVE_USER, userId);
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
  
  // 1. 로컬 캐시 먼저 로드 (빠른 UI 반응)
  const key = KEY_FAV_PREFIX + uid;
  try {
    const raw = await storage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    inMemoryFavorites = new Set(arr);
  } catch {
    inMemoryFavorites = new Set();
  }
  notify(); // 로컬 데이터로 우선 렌더링

  // 2. 로그인된 유저라면 Firestore에서 동기화
  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      const userDocRef = doc(db, "users", uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        const cloudFavs = (data.favorites as string[]) || [];
        
        // 로컬과 클라우드 병합 (합집합)
        const merged = new Set([...inMemoryFavorites, ...cloudFavs]);
        
        if (merged.size !== inMemoryFavorites.size) {
          inMemoryFavorites = merged;
          await persistFavorites(true); // 병합된 내용 다시 저장 (로컬+클라우드)
  notify();
        }
      }
    } catch (e) {
      }
  }
}

export async function persistFavorites(skipCloud: boolean = false): Promise<void> {
  if (!activeUserId) await ensureUserId();
  const uid = activeUserId!;
  const key = KEY_FAV_PREFIX + uid;
  const arr = [...inMemoryFavorites];
  
  // 1. 로컬 저장
  await storage.setItem(key, JSON.stringify(arr));

  // 2. 클라우드 저장 (로그인 유저인 경우)
  if (!skipCloud && auth.currentUser && auth.currentUser.uid === uid) {
    try {
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, { favorites: arr }, { merge: true });
    } catch (e) {
      console.error("[FAV] persist cloud error", e);
    }
  }
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
  
  notify(); // 즉시 반영
  await persistFavorites(); // 저장
}

export async function clearFavorites(): Promise<void> {
  if (!activeUserId) await ensureUserId();
  const uid = activeUserId!;
  const key = KEY_FAV_PREFIX + uid;
  
  // 메모리 초기화
  inMemoryFavorites.clear();
  
  // 로컬 저장소 삭제
  await storage.removeItem(key);
  
  // 클라우드 삭제 (로그인 유저인 경우)
  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, { favorites: [] }, { merge: true });
    } catch (e) {
      console.error("[FAV] clear cloud error", e);
    }
  }
  
  notify();
}

function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
