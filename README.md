## PB Term Project

> 
**`@igaeuen8` : UI/UX 기획 및 디자인, 프론트엔드 개발**

**`@M-SE0K` : 풀스택 개발 담당**
> 


## 프로젝트 소개 및 설명

**배포 URL:** http://113.198.66.75:18016/

<aside>

**AI 기반 전북권 대학 및 SW 사업단 통합 정보 플랫폼**

**본 서비스는 전북권 내 대학(전북대, 군산대, 원광대) 및 SW 관련 사업단에서 주최하는 다양한 행사와 이벤트 정보를 통합하여 제공하는 지능형 정보 플랫폼입니다.**

**각 기관별 웹사이트의 주요 게시판 콘텐츠를 주기적으로 수집(크롤링)하고, 수집된 방대한 데이터는 Google의 Gemini API를 통해 분석 및 가공됩니다. 이를 통해 사용자에게는 핵심 요약, 태그별 정보 추천, 실시간 푸시 알림, RAG 기반 챗봇 등 고도화된 정보 접근 경험을 제공합니다.**

**이는 기존의 흩어져 있던 정보를 찾기 위해 사용자가 각 사이트를 방문하여 정보를 직접 수집했던 불편함을 해소합니다.**
</aside>

### FrameWork
<span><img src="https://img.shields.io/badge/reactnative-61DAFB?style=for-the-badge&logo=react&logoColor=black"></span>
<span><img src="https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white"></span>
<span><img src="https://img.shields.io/badge/express-009922?style=for-the-badge&logo=express&logoColor=white"></span>
<span><img src="https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=Expo&logoColor=white"></span>
<span><img src="https://img.shields.io/badge/firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white"></span>
<span><img src="https://img.shields.io/badge/Docker-61DAFB?style=for-the-badge&logo=docker&logoColor=white"></span>
> 

### 프로젝트 구조

<img width="700" height="650" alt="Image" src="https://github.com/user-attachments/assets/76d4b4a8-c3ac-4471-bcd7-85d2b96ce902" />

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **홈** | 최신 공지사항 및 이벤트 실시간 표시<br>- 인기 게시물 조회수 기반 랭킹<br>- 카테고리별 필터링 (수강, 졸업, 학사, 취업, 공모전 등) |
| **소식** | 기관별 공지사항 통합 뷰<br>- 태그 기반 검색 및 필터링<br>- 상세 정보 및 원문 링크 제공 |
| **인기** | 조회수 기반 Hot 게시물<br>- 실시간 조회수 업데이트 |
| **챗봇** | RAG (Retrieval-Augmented Generation) 기반 지능형 챗봇<br>- Ollama LLM 활용<br>- 공지사항 및 이벤트 정보 실시간 검색<br>- 자연어 질의응답 |
| **즐겨찾기** | 관심 있는 게시물 저장<br>- Firebase 기반 클라우드 동기화<br>- 로그인 사용자 전용 |
| **알림** | 관심 태그 기반 맞춤형 알림 |
| **검색** | 실시간 검색<br>- 최근 검색어 저장<br>- 태그 및 키워드 기반 필터링 |
| **설정** | 관심 태그 관리<br>- 알림 설정<br>- 계정 관리<br>- 캐시 관리 |

---

## 개발환경 구축 및 실행

### 프로젝트 클론

```bash
git clone https://github.com/M-SE0K/JBSW-NOW.git
cd JBSW-NOW
```


### 필수 패키지 설치

```bash
# 프로젝트 의존성 설치
npm install
```

### 설치 및 세팅 `/script/stup.mjs`

```bash
npm run setup
```

### 실행 방법

```bash
# 로컬 전용 프록시
npm run proxylocal

npx expo start -c
# i : IOS 시뮬레이터 실행
# a : Android 애뮬레이터 실행
# w : web 실행
```

---
