# 로그인 데이터 CRUD 가이드

이 문서는 JBSW NOW 프로젝트에서 사용자 인증 및 사용자 데이터의 CRUD 작업을 설명합니다.

## 개요

프로젝트는 **Firebase Authentication**과 **Firestore**를 사용하여 사용자 인증 및 데이터를 관리합니다.

- **Firebase Authentication**: 사용자 로그인/로그아웃 관리
- **Firestore**: 사용자별 데이터 저장 (즐겨찾기, 관심 태그 등)

---

## 1. CREATE (생성)

### 1.1 사용자 로그인 (계정 생성)

Firebase Authentication은 Google OAuth를 통해 자동으로 사용자 계정을 생성합니다.

#### 웹 플랫폼

```typescript
// app/auth/login.tsx
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";

const handleGoogleSignIn = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  try {
    // 팝업 방식
    const result = await signInWithPopup(auth, provider);
    await handleAuthSuccess(result.user);
  } catch (popupError: any) {
    if (popupError.code === 'auth/popup-blocked') {
      // 팝업이 차단된 경우 리다이렉트 방식 사용
      await signInWithRedirect(auth, provider);
    }
  }
};
```

#### iOS/Android 플랫폼

```typescript
// app/auth/login.tsx
import * as Google from "expo-auth-session/providers/google";
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";

const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['profile', 'email'],
});

const handleIdTokenLogin = async (idToken: string) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  
  // 이메일 도메인 검증 (@jbnu.ac.kr)
  if (!result.user.email?.endsWith("@jbnu.ac.kr")) {
    await auth.signOut();
    throw new Error("전북대학교 계정만 사용 가능합니다.");
  }
};
```

### 1.2 사용자 데이터 초기화

로그인 성공 시 Firestore에 사용자 문서가 자동으로 생성됩니다.

```typescript
// src/services/auth.ts
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 로그인 시: 즐겨찾기 및 관심 태그 로드
    await Promise.all([
      hydrateFavorites(),      // Firestore에서 즐겨찾기 로드
      hydrateInterestedTags(),  // Firestore에서 관심 태그 로드
    ]);
  }
});
```

**Firestore 구조:**
```
users/
  {userId}/
    favorites: string[]           // 즐겨찾기 이벤트 ID 목록
    interestedTags: AllowedTag[]  // 관심 태그 목록
```

---

## 2. READ (조회)

### 2.1 현재 사용자 정보 조회

```typescript
// src/services/auth.ts

// 동기 방식 (즉시 반환)
export function getCurrentUser(): User | null {
  return currentUser;
}

// 사용 예시
import { getCurrentUser } from "../services/auth";

const user = getCurrentUser();
if (user) {
  console.log(user.uid);      // 사용자 고유 ID
  console.log(user.email);    // 이메일 주소
  console.log(user.displayName); // 표시 이름
}
```

### 2.2 인증 상태 구독 (실시간)

```typescript
// src/services/auth.ts
export function subscribeAuth(callback: (user: User | null) => void): () => void {
  listeners.add(callback);
  callback(currentUser); // 초기 상태 즉시 호출
  return () => listeners.delete(callback); // 구독 해제 함수 반환
}

// 사용 예시
import { subscribeAuth } from "../services/auth";

useEffect(() => {
  const unsubscribe = subscribeAuth((user) => {
    if (user) {
      console.log("로그인됨:", user.email);
    } else {
      console.log("로그아웃됨");
    }
  });
  
  return unsubscribe; // 컴포넌트 언마운트 시 구독 해제
}, []);
```

### 2.3 사용자 데이터 조회

#### 즐겨찾기 조회

```typescript
// src/services/favorites.ts
import { getFavorites, isFavorite } from "../services/favorites";

// 전체 즐겨찾기 목록
const favorites = getFavorites(); // string[]

// 특정 이벤트가 즐겨찾기에 있는지 확인
const isFav = isFavorite(eventId); // boolean
```

#### 관심 태그 조회

```typescript
// src/services/interestedTags.ts
import { getInterestedTags, isInterestedTag } from "../services/interestedTags";

// 전체 관심 태그 목록
const tags = getInterestedTags(); // AllowedTag[]

// 특정 태그가 관심 태그에 있는지 확인
const isInterested = isInterestedTag("취업"); // boolean
```

### 2.4 Firestore에서 직접 조회

```typescript
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../db/firebase";

const getUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const userDocRef = doc(db, "users", user.uid);
  const snap = await getDoc(userDocRef);
  
  if (snap.exists()) {
    const data = snap.data();
    return {
      favorites: data.favorites || [],
      interestedTags: data.interestedTags || [],
    };
  }
  
  return null;
};
```

---

## 3. UPDATE (업데이트)

### 3.1 사용자 프로필 업데이트

```typescript
import { updateProfile } from "firebase/auth";
import { auth } from "../db/firebase";

const updateUserProfile = async (displayName: string, photoURL?: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  
  await updateProfile(user, {
    displayName,
    photoURL,
  });
};
```

### 3.2 즐겨찾기 업데이트

```typescript
// src/services/favorites.ts

// 즐겨찾기 추가/제거 (토글)
import { toggleFavorite } from "../services/favorites";

await toggleFavorite(eventId); // 추가 또는 제거

// 모든 즐겨찾기 삭제
import { clearFavorites } from "../services/favorites";

await clearFavorites();
```

**내부 동작:**
```typescript
export async function toggleFavorite(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in");
  
  const wasFav = inMemoryFavorites.has(id);
  if (wasFav) {
    inMemoryFavorites.delete(id);
  } else {
    inMemoryFavorites.add(id);
  }
  
  notify(); // 즉시 UI 반영
  await persistFavorites(); // Firestore에 저장
}

async function persistFavorites(): Promise<void> {
  const user = auth.currentUser;
  const arr = [...inMemoryFavorites];
  
  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, { favorites: arr }, { merge: true });
}
```

### 3.3 관심 태그 업데이트

```typescript
// src/services/interestedTags.ts

// 관심 태그 추가/제거 (토글)
import { toggleInterestedTag } from "../services/interestedTags";

await toggleInterestedTag("취업"); // 추가 또는 제거

// 관심 태그 전체 설정
import { setInterestedTags } from "../services/interestedTags";

await setInterestedTags(["취업", "공모전", "학사"]);

// 모든 관심 태그 삭제
import { clearInterestedTags } from "../services/interestedTags";

await clearInterestedTags();
```

**내부 동작:**
```typescript
export async function toggleInterestedTag(tag: AllowedTag): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in");
  
  const wasInterested = inMemoryTags.has(tag);
  if (wasInterested) {
    inMemoryTags.delete(tag);
  } else {
    inMemoryTags.add(tag);
  }
  
  notify(); // 즉시 UI 반영
  await persistInterestedTags(); // Firestore에 저장
}

async function persistInterestedTags(): Promise<void> {
  const user = auth.currentUser;
  const arr = [...inMemoryTags];
  
  const userDocRef = doc(db, "userPreferences", user.uid);
  await setDoc(userDocRef, { interestedTags: arr }, { merge: true });
}
```

### 3.4 Firestore 직접 업데이트

```typescript
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../db/firebase";

// 문서 전체 교체 (merge: true로 기존 데이터 보존)
const updateUserData = async (data: Partial<UserData>) => {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  
  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, data, { merge: true });
};

// 특정 필드만 업데이트
const updateUserField = async (field: string, value: any) => {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  
  const userDocRef = doc(db, "users", user.uid);
  await updateDoc(userDocRef, { [field]: value });
};
```

---

## 4. DELETE (삭제)

### 4.1 로그아웃

```typescript
// src/services/auth.ts
import { logout } from "../services/auth";

await logout(); // Firebase에서 로그아웃
```

**내부 동작:**
```typescript
export async function logout() {
  try {
    console.log("[AUTH] Logging out...");
    await firebaseSignOut(auth);
    console.log("[AUTH] Logout successful");
    
    // onAuthStateChanged가 자동으로 호출되어
    // currentUser가 null로 설정되고
    // 모든 리스너에게 알림이 전달됨
  } catch (e: any) {
    console.error("[AUTH] logout error", e);
    throw e;
  }
}
```

### 4.2 계정 삭제

```typescript
import { deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../db/firebase";

const deleteAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  
  try {
    // Firestore에서 사용자 데이터 삭제
    const userDocRef = doc(db, "users", user.uid);
    await deleteDoc(userDocRef);
    
    // Firebase Authentication에서 계정 삭제
    await deleteUser(user);
    
    console.log("계정이 삭제되었습니다.");
  } catch (error) {
    console.error("계정 삭제 실패:", error);
    throw error;
  }
};
```

### 4.3 사용자 데이터 삭제

```typescript
// 즐겨찾기 전체 삭제
import { clearFavorites } from "../services/favorites";
await clearFavorites();

// 관심 태그 전체 삭제
import { clearInterestedTags } from "../services/interestedTags";
await clearInterestedTags();
```

---

## 5. 데이터 흐름도

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 액션                            │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│  Firebase Auth  │    │    Firestore     │
│  (인증 관리)     │    │  (사용자 데이터)  │
└────────┬────────┘    └────────┬─────────┘
         │                      │
         │  onAuthStateChanged  │
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────┐
│      src/services/auth.ts               │
│  - getCurrentUser()                     │
│  - subscribeAuth()                     │
│  - logout()                            │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│Favorites│ │InterestedTags│
│Service │ │   Service    │
└────────┘ └──────────────┘
```

---

## 6. 주요 함수 요약

### 인증 관련 (`src/services/auth.ts`)

| 함수 | 설명 | 반환값 |
|------|------|--------|
| `getCurrentUser()` | 현재 로그인한 사용자 정보 조회 | `User \| null` |
| `subscribeAuth(callback)` | 인증 상태 변경 구독 | `() => void` (구독 해제 함수) |
| `logout()` | 로그아웃 | `Promise<void>` |

### 즐겨찾기 관련 (`src/services/favorites.ts`)

| 함수 | 설명 | 반환값 |
|------|------|--------|
| `getFavorites()` | 즐겨찾기 목록 조회 | `string[]` |
| `isFavorite(id)` | 즐겨찾기 여부 확인 | `boolean` |
| `toggleFavorite(id)` | 즐겨찾기 추가/제거 | `Promise<void>` |
| `clearFavorites()` | 모든 즐겨찾기 삭제 | `Promise<void>` |
| `hydrateFavorites()` | Firestore에서 로드 | `Promise<void>` |
| `persistFavorites()` | Firestore에 저장 | `Promise<void>` |

### 관심 태그 관련 (`src/services/interestedTags.ts`)

| 함수 | 설명 | 반환값 |
|------|------|--------|
| `getInterestedTags()` | 관심 태그 목록 조회 | `AllowedTag[]` |
| `isInterestedTag(tag)` | 관심 태그 여부 확인 | `boolean` |
| `toggleInterestedTag(tag)` | 관심 태그 추가/제거 | `Promise<void>` |
| `setInterestedTags(tags)` | 관심 태그 전체 설정 | `Promise<void>` |
| `clearInterestedTags()` | 모든 관심 태그 삭제 | `Promise<void>` |
| `hydrateInterestedTags()` | Firestore에서 로드 | `Promise<void>` |
| `persistInterestedTags()` | Firestore에 저장 | `Promise<void>` |

---

## 7. 보안 고려사항

1. **인증 필수**: 모든 사용자 데이터 작업은 로그인된 사용자만 가능
2. **이메일 도메인 검증**: `@jbnu.ac.kr` 계정만 로그인 가능
3. **Firestore Security Rules**: 서버 측에서 데이터 접근 제어
4. **인증 상태 실시간 감지**: `onAuthStateChanged`로 자동 동기화

---

## 8. 예제 코드

### 완전한 사용 예시

```typescript
import { useEffect, useState } from "react";
import { getCurrentUser, subscribeAuth, logout } from "../services/auth";
import { getFavorites, toggleFavorite } from "../services/favorites";
import { getInterestedTags, toggleInterestedTag } from "../services/interestedTags";
import { User } from "firebase/auth";

export function useUserData() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [interestedTags, setInterestedTags] = useState<string[]>([]);
  
  useEffect(() => {
    // 인증 상태 구독
    const unsubscribeAuth = subscribeAuth((authUser) => {
      setUser(authUser);
    });
    
    // 즐겨찾기 구독
    const unsubscribeFavs = subscribeFavorites(() => {
      setFavorites(getFavorites());
    });
    
    // 관심 태그 구독
    const unsubscribeTags = subscribeInterestedTags(() => {
      setInterestedTags(getInterestedTags());
    });
    
    return () => {
      unsubscribeAuth();
      unsubscribeFavs();
      unsubscribeTags();
    };
  }, []);
  
  return {
    user,
    favorites,
    interestedTags,
    isLoggedIn: !!user,
    toggleFavorite,
    toggleInterestedTag,
    logout,
  };
}
```

---

## 참고 자료

- [Firebase Authentication 문서](https://firebase.google.com/docs/auth)
- [Firestore 문서](https://firebase.google.com/docs/firestore)
- [Firebase Auth React Native 가이드](https://rnfirebase.io/auth/usage)

