### 프로젝트 개요
AI 기반 전북권 대학 및 SW 사업단 통합 정보 플랫폼 (Expo) 프로토타입.

### 실행 방법
- 의존성 설치: `pnpm i` 또는 `yarn` 또는 `npm i`
- 환경변수: `.env`에 `EXPO_PUBLIC_API_BASE_URL` 지정
- 개발 실행: `npx expo start --clear`

### iOS/Android 테스트
- iOS 시뮬레이터: `npx expo run:ios`
- Android 에뮬레이터: `npx expo run:android`

### EAS Build (배포용)
1) EAS CLI 설치: `npm i -g eas-cli`
2) 로그인: `eas login`
3) (옵션) 네이티브 빌드 준비: `npx expo prebuild --clean`
4) 빌드 실행:
   - iOS: `eas build --platform ios`
   - Android: `eas build --platform android`
### 쳐다보는데? 
### 간단 API 계약
- GET `/events?q&orgId&cursor` → `{ data: Event[], nextCursor }`
- GET `/events/:id` → `Event`
- GET `/orgs` → `Org[]`
- POST `/chat/ask { query }` → `{ answer, citations? }`
- POST `/devices { expoPushToken }` → `{ ok: true }`

자세한 설명은 코드 주석과 `.env.example` 참조.


