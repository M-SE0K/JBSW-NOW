import { 
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User 
} from "firebase/auth";
import { auth } from "../db/firebase";
import { hydrateFavorites } from "./favorites";
import { hydrateInterestedTags } from "./interestedTags";

let currentUser: User | null = null;
const listeners = new Set<(user: User | null) => void>();

// Auth 상태 초기화
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  console.log("[AUTH] state changed:", user ? `${user.uid} (${user.email})` : "null");
  
  if (user) {
    // 로그인 시: 즐겨찾기 및 관심 태그 로드
    await Promise.all([
      hydrateFavorites(),
      hydrateInterestedTags(),
    ]);
  } else {
    // 로그아웃 시: 즐겨찾기 및 관심 태그 초기화 (인증이 필수이므로 페이지 접근 불가)
    // 실제로는 로그아웃 시 페이지에서 나가게 되므로 여기서는 초기화만
  }
  
  notifyListeners();
});

export function getCurrentUser(): User | null {
  return currentUser;
}

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  listeners.add(callback);
  callback(currentUser);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach((cb) => cb(currentUser));
}

export async function logout() {
  try {
    console.log("[AUTH] Logging out...");
    await firebaseSignOut(auth);
    console.log("[AUTH] Logout successful");
  } catch (e: any) {
    console.error("[AUTH] logout error", e);
    throw e;
  }
}
