# 시스템 아키텍처 분석 및 개선 방안

## 현재 구조 vs 다이어그램 비교

### ✅ 현재 구현된 부분

1. **Mobile App / Web Browser** → 클라이언트 (Expo React Native)
2. **Firebase Database** → `src/db/firebase.tsx`로 직접 접근
3. **Ollama (AI 모델)** → `server/proxy.js`를 통해 프록시
4. **Gemini API** → `src/api/gemini/gemini.ts`에서 클라이언트에서 직접 호출

### ❌ 다이어그램에 있지만 현재 없는 부분

1. **API Gateway** - 현재 프록시 서버만 존재 (`server/proxy.js`는 Ollama 전용)
2. **Backend 서버** - 클라이언트가 직접 Firebase와 Gemini API에 접근
3. **Web Crawler (별도 프로세스)** - 크롤러가 별도 프로세스로 분리되어 있지 않음

## 현재 데이터 흐름

### 크롤링 → 저장 흐름 (현재)
```
크롤러 (미구현/별도 프로세스) 
  → processCrawledText/processCrawledImage (src/services/ingest.ts)
  → Gemini API 호출 (클라이언트에서 직접)
  → saveEventToFirestore (Firebase에 저장)
```

### 챗봇 흐름 (현재)
```
클라이언트 (app/chat/index.tsx)
  → askChat (src/api/chat.ts)
  → RAG 검색 (src/api/rag.ts)
  → 프록시 서버 (server/proxy.js)
  → Ollama 서버
```

## 개선 방안: 다이어그램과 일치시키기

### 1. Backend 서버 추가

**역할:**
- Gemini API 호출 (클라이언트에서 분리)
- 크롤러 데이터 수신 및 처리
- Firebase 저장 로직 중앙화
- API Gateway 역할

**구조:**
```
server/
  ├── proxy.js          # Ollama 프록시 (기존)
  ├── backend.js        # 새로 추가: 메인 백엔드 서버
  └── routes/
      ├── ingest.js     # 크롤러 데이터 수신
      ├── gemini.js     # Gemini API 프록시
      └── events.js     # 이벤트 관리 API
```

### 2. API Gateway 통합

**역할:**
- 모든 요청을 중앙에서 라우팅
- 인증/인가 처리
- 요청 로깅 및 모니터링

**구조:**
```
server/
  └── gateway.js       # API Gateway (모든 요청 통합)
      ├── /api/ollama/* → proxy.js
      ├── /api/gemini/* → backend.js
      ├── /api/events/* → backend.js
      └── /api/ingest/* → backend.js
```

### 3. Web Crawler 별도 프로세스

**역할:**
- 전북대, 군산대, 원광대, SW 사업단 웹사이트 크롤링
- 주기적으로 실행 (cron job 또는 스케줄러)
- 크롤링한 데이터를 Backend API로 전송

**구조:**
```
crawler/
  ├── index.js         # 크롤러 메인
  ├── scrapers/
  │   ├── jbnu.js     # 전북대 크롤러
  │   ├── kunsan.js   # 군산대 크롤러
  │   ├── wonkwang.js # 원광대 크롤러
  │   └── sw.js       # SW 사업단 크롤러
  └── scheduler.js     # 스케줄러 (주기적 실행)
```

## 권장 아키텍처 (다이어그램과 일치)

```
┌─────────────────┐
│  Mobile App     │
│  Web Browser    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │  ← 모든 요청 통합 관리
│  (gateway.js)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Backend │ │ Proxy Server │
│ Server  │ │ (proxy.js)   │
└────┬────┘ └──────┬───────┘
     │            │
     │            ▼
     │      ┌──────────┐
     │      │  Ollama  │
     │      └──────────┘
     │
     ├──────────┬──────────┐
     │          │          │
     ▼          ▼          ▼
┌─────────┐ ┌──────────┐ ┌──────────────┐
│ Gemini  │ │ Firebase │ │ Web Crawler  │
│   API   │ │ Database │ │ (별도 프로세스)│
└─────────┘ └─────┬─────┘ └──────┬───────┘
                  │              │
                  └──────┬───────┘
                         │
                    (크롤러 → Backend → Firebase)
```

## 구현 단계

### Phase 1: Backend 서버 구축
1. `server/backend.js` 생성
2. Gemini API 호출 로직을 Backend로 이동
3. 크롤러 데이터 수신 엔드포인트 추가

### Phase 2: API Gateway 통합
1. `server/gateway.js` 생성
2. 기존 프록시 서버를 Gateway 하위로 통합
3. Backend 서버를 Gateway 하위로 통합

### Phase 3: 크롤러 분리
1. `crawler/` 디렉토리 생성
2. 크롤러를 별도 Node.js 프로세스로 분리
3. 스케줄러 설정 (cron 또는 node-cron)

### Phase 4: 클라이언트 수정
1. Gemini API 직접 호출 제거
2. Backend API를 통해 호출하도록 변경
3. 인증 토큰 관리 추가

## 빠진 것들 체크리스트

- [ ] **Backend 서버** - Gemini API 호출, 데이터 처리 중앙화
- [ ] **API Gateway** - 모든 요청 통합 관리
- [ ] **Web Crawler (별도 프로세스)** - 주기적 크롤링
- [ ] **인증/인가 시스템** - API Gateway에서 처리
- [ ] **로깅/모니터링** - 요청 추적 및 에러 처리
- [ ] **환경 변수 관리** - Backend에서 API 키 관리
- [ ] **에러 핸들링** - 중앙화된 에러 처리
- [ ] **Rate Limiting** - API 호출 제한

## 보안 고려사항

1. **API 키 보호**: Gemini API 키를 클라이언트에서 제거하고 Backend에서만 사용
2. **인증 토큰**: Firebase Auth 토큰을 API Gateway에서 검증
3. **CORS 설정**: API Gateway에서 CORS 정책 중앙 관리
4. **Rate Limiting**: API Gateway에서 요청 제한

