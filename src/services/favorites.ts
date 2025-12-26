import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../db/firebase";

let inMemoryFavorites = new Set<string>();
let listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

/**
 * 현재 로그인한 사용자의 즐겨찾기를 Firestore에서 로드
 */
export async function hydrateFavorites(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    inMemoryFavorites = new Set();
    notify();
    return;
  }

  try {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const favs = (data.favorites as string[]) || [];
      inMemoryFavorites = new Set(favs);
    } else {
      inMemoryFavorites = new Set();
    }
  } catch (e) {
    console.error("[FAV] hydrate error", e);
    inMemoryFavorites = new Set();
  }
  
  notify();
}

/**
 * 현재 로그인한 사용자의 즐겨찾기를 Firestore에 저장
 */
export async function persistFavorites(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("[FAV] Cannot persist favorites: user not logged in");
    return;
  }

  const arr = [...inMemoryFavorites];
  
  try {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { favorites: arr }, { merge: true });
  } catch (e) {
    console.error("[FAV] persist error", e);
    throw e;
  }
}

/**
 * 현재 로그인한 사용자의 즐겨찾기 목록 반환
 */
export function getFavorites(): string[] {
  return [...inMemoryFavorites];
}

/**
 * 특정 ID가 즐겨찾기에 있는지 확인
 */
export function isFavorite(id: string): boolean {
  return inMemoryFavorites.has(id);
}

/**
 * 즐겨찾기 토글 (추가/제거)
 */
export async function toggleFavorite(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to toggle favorites");
  }

  const wasFav = inMemoryFavorites.has(id);
  if (wasFav) {
    inMemoryFavorites.delete(id);
  } else {
    inMemoryFavorites.add(id);
  }
  
  notify(); // 즉시 UI 반영
  await persistFavorites(); // Firestore에 저장
}

/**
 * 모든 즐겨찾기 삭제
 */
export async function clearFavorites(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to clear favorites");
  }

  inMemoryFavorites.clear();
  
  try {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { favorites: [] }, { merge: true });
  } catch (e) {
    console.error("[FAV] clear error", e);
    throw e;
  }
  
  notify();
}

/**
 * 사용자 전환 시 즐겨찾기 새로고침
 * @deprecated 이제 인증이 필수이므로 switchUser는 단순히 새로고침만 수행
 */
export async function switchUser(userId: string): Promise<void> {
  await hydrateFavorites();
}

/**
 * 현재 사용자 ID 확인 (인증 필수)
 * @deprecated auth.currentUser.uid를 직접 사용하세요
 */
export async function ensureUserId(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in");
  }
  await hydrateFavorites();
  return user.uid;
}

/**
 * 현재 사용자 ID 동기 반환 (인증 필수)
 * @deprecated auth.currentUser?.uid를 직접 사용하세요
 */
export function getActiveUserIdSync(): string | null {
  return auth.currentUser?.uid ?? null;
}
