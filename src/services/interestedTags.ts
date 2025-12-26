import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../db/firebase";
import { ALLOWED_TAGS, type AllowedTag } from "./tags";

let inMemoryTags = new Set<AllowedTag>();
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
 * 현재 로그인한 사용자의 관심 태그를 Firestore에서 로드
 */
export async function hydrateInterestedTags(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    inMemoryTags = new Set();
    notify();
    return;
  }

  try {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const tags = (data.interestedTags as AllowedTag[]) || [];
      inMemoryTags = new Set(tags.filter(tag => ALLOWED_TAGS.includes(tag)));
    } else {
      inMemoryTags = new Set();
    }
  } catch (e) {
    console.error("[INTERESTED_TAGS] hydrate error", e);
    inMemoryTags = new Set();
  }
  
  notify();
}

/**
 * 현재 로그인한 사용자의 관심 태그를 Firestore에 저장
 */
export async function persistInterestedTags(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("[INTERESTED_TAGS] Cannot persist tags: user not logged in");
    return;
  }

  const arr = [...inMemoryTags];
  
  try {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { interestedTags: arr }, { merge: true });
  } catch (e) {
    console.error("[INTERESTED_TAGS] persist error", e);
    throw e;
  }
}

/**
 * 현재 로그인한 사용자의 관심 태그 목록 반환
 */
export function getInterestedTags(): AllowedTag[] {
  return [...inMemoryTags];
}

/**
 * 특정 태그가 관심 태그에 있는지 확인
 */
export function isInterestedTag(tag: AllowedTag): boolean {
  return inMemoryTags.has(tag);
}

/**
 * 관심 태그 토글 (추가/제거)
 */
export async function toggleInterestedTag(tag: AllowedTag): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to toggle interested tags");
  }

  const wasInterested = inMemoryTags.has(tag);
  if (wasInterested) {
    inMemoryTags.delete(tag);
  } else {
    inMemoryTags.add(tag);
  }
  
  notify(); // 즉시 UI 반영
  await persistInterestedTags(); // Firestore에 저장
}

/**
 * 관심 태그 설정 (전체 교체)
 */
export async function setInterestedTags(tags: AllowedTag[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to set interested tags");
  }

  // 유효한 태그만 필터링
  const validTags = tags.filter(tag => ALLOWED_TAGS.includes(tag));
  inMemoryTags = new Set(validTags);
  
  notify(); // 즉시 UI 반영
  await persistInterestedTags(); // Firestore에 저장
}

/**
 * 모든 관심 태그 삭제
 */
export async function clearInterestedTags(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to clear interested tags");
  }

  inMemoryTags.clear();
  
  try {
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { interestedTags: [] }, { merge: true });
  } catch (e) {
    console.error("[INTERESTED_TAGS] clear error", e);
    throw e;
  }
  
  notify();
}

