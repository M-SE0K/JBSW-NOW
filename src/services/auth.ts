import { 
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User 
} from "firebase/auth";
import { auth } from "../db/firebase";
import { switchUser, ensureUserId } from "./favorites";

let currentUser: User | null = null;
const listeners = new Set<(user: User | null) => void>();

// Auth 상태 초기화
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  console.log("[AUTH] state changed:", user ? `${user.uid} (${user.email})` : "null");
  
  if (user) {
    // 로그인 시: 해당 유저 ID로 즐겨찾기 서비스 전환
    await switchUser(user.uid);
  } else {
    // 로그아웃 시: 게스트 ID(로컬 UUID)로 복귀
    await ensureUserId(); 
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
