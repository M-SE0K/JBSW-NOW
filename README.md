## Team 안진마

**`[@do-ttery]` : UI/UX 기획 및 디자인, 프론트엔드 개발**  **https://github.com/do-ttery**

**`@cheoleon` : 백엔드 개발 담당** **https://github.com/St2usy/crawler.git**

**`@M-SE0K` : 풀스택 개발 담당**

**프로젝트 진행간 풀스택 개발을 담당하여 크롤러를 제외한 모든 부분에 기획 및 개발을 하며 진행하였습니다.**

---

## 프로젝트 소개 및 설명

<aside>
  
**AI 기반 전북권 대학 및 SW 사업단 통합 정보 플랫폼**

**본 서비스는 전북권 내 대학(전북대, 군산대, 원광대) 및 SW 관련 사업단에서 주최하는 다양한 행사와 이벤트 정보를 통합하여 제공하는 지능형 정보 플랫폼입니다.**

**각 기관별 웹사이트의 주요 게시판 콘텐츠를 주기적으로 수집(크롤링)하고, 수집된 방대한 데이터는 Google의 Gemini API를 통해 분석 및 가공됩니다. 이를 통해 사용자에게는 핵심 요약, 태그별 정보 추천, 실시간 푸시 알림 등 고도화된 정보 접근 경험을 제공합니다.**

**이는 기존의 흩어져 있던 정보를 찾기 위해 사용자가 각 사이트를 방문하여 정보를 직접 수집했던 불편함을 해소합니다.**

**본 프로젝트는 2025년 오픈소스 SW 아이디어 해커톤 캠프에서 장려상을 수상한 서비스입니다.**

</aside>

### FrameWork
<img src="https://img.shields.io/badge/reactnative-61DAFB?style=for-the-badge&logo=react&logoColor=black"><img src="https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white"><img src="https://img.shields.io/badge/express-009922?style=for-the-badge&logo=express&logoColor=white"><img src="https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=Expo&logoColor=white"><img src="https://img.shields.io/badge/firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white">
> 

### 프로젝트 구조
<img width="638" height="725" alt="figma" src="https://github.com/user-attachments/assets/c755523a-c52d-408c-8fdc-a0b4e86cd588" />

---

## 개발환경 구축 및 실행

### 프로젝트 클론

```bash
git clone https://github.com/M-SE0K/JBSW-NOW.git
cd JBSW-NOW
```

### 설치 및 세팅 `/script/stup.mjs`

```bash
npm run setup
```

### 실행 방법

```bash
//이미지 CORS 우회용 프록시 실행.
npm run proxy

//expo 크로스 플랫폼 실행
npx expo start -c
```

---
