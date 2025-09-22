### 프로젝트 개요
AI 기반 전북권 대학 및 SW 사업단 통합 정보 플랫폼 (Expo) 프로토타입.

### 개발 환경 요구사항 (필수)
- **Node.js**: 18 LTS 또는 20 LTS 권장 (nvm 사용 추천)
- **npm**: 프로젝트는 npm 표준 사용 (package-lock.json 유지)
- **Watchman (macOS)**: 파일 감시 최적화 (`brew install watchman`)
- **Xcode 15+ (iOS 개발 시)**: Command Line Tools 포함, iOS 시뮬레이터
- **CocoaPods (iOS 네이티브 빌드 시)**: `sudo gem install cocoapods`
- **Android Studio (Android 개발 시)**: SDK, 에뮬레이터, Java 17 설정

### 클론 후 초기 설정
1) 저장소 클론
```bash
git clone <REPO_URL>
cd <REPO_DIR>
```
2) 패키지 매니저 고정 (npm 사용)
- 다른 락파일이 있으면 제거하세요:
```bash
rm -f pnpm-lock.yaml yarn.lock
```
3) 의존성 설치
```bash
npm install
```

### 환경 변수 설정
- 루트에 `.env` 생성:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
```
- 앱은 `src/api/client.ts`에서 `EXPO_PUBLIC_API_BASE_URL`를 사용합니다.

### 실행 방법 (개발)
- Dev 서버(클린 캐시):
```bash
npx expo start -c
```
- iOS 시뮬레이터:
```bash
npx expo run:ios
```
- Android 에뮬레이터:
```bash
npx expo run:android
```

### 프로젝트 스크립트
- **dev**: `expo start -c`
- **start**: `expo start`
- **ios**: `expo run:ios`
- **android**: `expo run:android`

### 필수/선택 패키지 안내
- 본 프로젝트는 **Expo SDK 54** 기반입니다.
- 주요 패키지: `expo-router`, `@tanstack/react-query`, `expo-notifications`, `expo-secure-store`, `expo-device` 등
- 누락 경고 발생 시(피어 의존성):
```bash
npx expo install expo-font @expo/metro-runtime expo-constants expo-linking react-native-worklets
```
(이미 `package.json`에 포함되어 있으면 `npm install`만으로 설치됩니다.)

### iOS/Android 주의사항
- **푸시 알림 토큰**: 실기기에서만 발급 (`expo-notifications`, `expo-device` 필요)
- **iOS 네이티브 빌드**: 처음 `npx expo run:ios` 시 Pod 설치 시간이 걸릴 수 있음
- **Android**: 에뮬레이터가 띄워져 있어야 `run:android`가 빠르게 동작

### 트러블슈팅
- **포트 충돌(8081)**: 다른 Metro가 떠 있을 수 있습니다.
```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
kill -9 <PID>
```
- **Watchman 재인덱싱 경고/모듈 해상 실패(Unable to resolve 'expo')**:
```bash
watchman watch-del "$(pwd | xargs dirname)" ; watchman watch-project "$(pwd | xargs dirname)"
rm -rf node_modules/.cache
npx expo start -c
```
- **자산(icons/splash) 누락**: 기본 아이콘/스플래시를 사용하지 않도록 설정되어 있습니다. 커스텀 자산을 쓰려면 `assets/`에 파일을 추가하고 `app.config.ts`에서 경로를 지정하세요.
- **라우터 origin 설정**: `app.config.ts`의 `extra.router.origin`은 개발 중이라면 생략하거나 유효한 URL만 사용하세요. 유효하지 않은 문자열은 Dev Server 기동 시 에러가 납니다.

### EAS Build (배포용)
1) EAS CLI 설치: `npm i -g eas-cli`
2) 로그인: `eas login`
3) (옵션) 네이티브 빌드 준비: `npx expo prebuild --clean`
4) 빌드 실행:
   - iOS: `eas build --platform ios`
   - Android: `eas build --platform android`

### 간단 API 계약
- GET `/events?q&orgId&cursor` → `{ data: Event[], nextCursor }`
- GET `/events/:id` → `Event`
- GET `/orgs` → `Org[]`
- POST `/chat/ask { query }` → `{ answer, citations? }`
- POST `/devices { expoPushToken }` → `{ ok: true }`

자세한 설명은 코드 주석과 `.env.example`(필요 시 생성) 참조.


