#!/usr/bin/env node

/**
 * Firebase에서 학습 데이터 추출 스크립트
 * 
 * 사용법:
 *   node scripts/export-firebase-data.mjs
 * 
 * 출력:
 *   - data/notices.json: 공지사항 원본 데이터
 *   - data/events.json: 이벤트 원본 데이터
 *   - data/training_data.jsonl: Fine-tuning용 학습 데이터
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 수동 로드 (dotenv 없이)
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env 파일을 찾을 수 없습니다:", envPath);
    console.error("   프로젝트 루트에 .env 파일이 있는지 확인하세요.");
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 빈 줄, 주석 무시
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    
    // 따옴표 제거
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    process.env[key] = value;
  }
  
  return true;
}

// 환경 변수 로드
if (!loadEnv()) {
  process.exit(1);
}

// Firebase 설정 확인
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 설정 검증
console.log("🔧 Firebase 설정 확인:");
console.log(`   - projectId: ${firebaseConfig.projectId || "❌ 미설정"}`);
console.log(`   - apiKey: ${firebaseConfig.apiKey ? "✅ 설정됨" : "❌ 미설정"}`);

if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error("\n❌ Firebase 설정이 불완전합니다!");
  console.error("   .env 파일에 EXPO_PUBLIC_FIREBASE_* 환경 변수가 설정되어 있는지 확인하세요.");
  process.exit(1);
}

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 출력 디렉토리 생성
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * notices 컬렉션에서 데이터 추출
 */
async function fetchNotices(maxCount = 1000) {
  console.log("📥 notices 컬렉션 추출 중...");
  const ref = collection(db, "notices");
  
  let snap;
  try {
    snap = await getDocs(query(ref, orderBy("date", "desc"), limit(maxCount)));
  } catch {
    try {
      snap = await getDocs(query(ref, orderBy("firebase_created_at", "desc"), limit(maxCount)));
    } catch {
      snap = await getDocs(query(ref, limit(maxCount)));
    }
  }

  const notices = [];
  snap.forEach((doc) => {
    const d = doc.data();
    notices.push({
      id: doc.id,
      title: d.title || "",
      content: d.content || d.content_html || "",
      author: d.author || "",
      category: d.category || "",
      date: d.date || d.firebase_created_at || "",
      url: d.url || "",
    });
  });

  console.log(`  ✅ ${notices.length}건 추출 완료`);
  return notices;
}

/**
 * events 컬렉션에서 데이터 추출
 */
async function fetchEvents(maxCount = 1000) {
  console.log("📥 events 컬렉션 추출 중...");
  const ref = collection(db, "events");
  
  let snap;
  try {
    snap = await getDocs(query(ref, orderBy("date", "desc"), limit(maxCount)));
  } catch {
    snap = await getDocs(query(ref, limit(maxCount)));
  }

  const events = [];
  snap.forEach((doc) => {
    const d = doc.data();
    events.push({
      id: doc.id,
      title: d.title || "",
      summary: d.summary || "",
      startAt: d.startAt || "",
      endAt: d.endAt || "",
      location: d.location || "",
      tags: d.tags || [],
      org: d.org || {},
      sourceUrl: d.sourceUrl || "",
    });
  });

  console.log(`  ✅ ${events.length}건 추출 완료`);
  return events;
}

/**
 * HTML 태그 및 불필요한 문자 제거
 */
function cleanText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, "") // HTML 태그 제거
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ") // 연속 공백 정리
    .trim();
}

/**
 * Fine-tuning용 학습 데이터 생성
 * 형식: {"instruction": "질문", "input": "", "output": "답변"}
 */
function generateTrainingData(notices, events) {
  console.log("🔄 학습 데이터 생성 중...");
  const trainingData = [];

  // 1. 공지사항 기반 Q&A 생성
  notices.forEach((notice) => {
    const title = cleanText(notice.title);
    const content = cleanText(notice.content).slice(0, 500); // 최대 500자
    const author = notice.author || "공지";
    const date = notice.date || "";

    if (!title || !content) return;

    // 공지 내용 질문
    trainingData.push({
      instruction: `"${title}" 공지 내용이 뭐야?`,
      input: "",
      output: `${title}에 대한 공지입니다.\n\n${content}`,
    });

    // 공지 요약 질문
    trainingData.push({
      instruction: `${title} 요약해줘`,
      input: "",
      output: content.slice(0, 200),
    });

    // 날짜 질문
    if (date) {
      trainingData.push({
        instruction: `${title} 언제 올라온 공지야?`,
        input: "",
        output: `${title} 공지는 ${date}에 게시되었습니다.`,
      });
    }
  });

  // 2. 이벤트 기반 Q&A 생성
  events.forEach((event) => {
    const title = cleanText(event.title);
    const summary = cleanText(event.summary).slice(0, 500);
    const location = event.location || "";
    const startAt = event.startAt || "";
    const endAt = event.endAt || "";
    const tags = event.tags?.join(", ") || "";

    if (!title) return;

    // 이벤트 내용 질문
    if (summary) {
      trainingData.push({
        instruction: `"${title}" 이벤트 내용이 뭐야?`,
        input: "",
        output: `${title}에 대한 정보입니다.\n\n${summary}`,
      });
    }

    // 장소 질문
    if (location) {
      trainingData.push({
        instruction: `${title} 어디서 열려?`,
        input: "",
        output: `${title}은(는) ${location}에서 진행됩니다.`,
      });
    }

    // 날짜 질문
    if (startAt) {
      const dateInfo = endAt ? `${startAt}부터 ${endAt}까지` : startAt;
      trainingData.push({
        instruction: `${title} 언제야?`,
        input: "",
        output: `${title}은(는) ${dateInfo} 진행됩니다.`,
      });
    }

    // 태그 질문
    if (tags) {
      trainingData.push({
        instruction: `${title} 관련 태그가 뭐야?`,
        input: "",
        output: `${title}의 관련 태그: ${tags}`,
      });
    }
  });

  // 3. 일반 질문 추가
  const generalQA = [
    {
      instruction: "오늘 새로 올라온 공지 알려줘",
      input: "",
      output: "최근 공지사항을 확인해드리겠습니다. 공지 목록을 확인해주세요.",
    },
    {
      instruction: "다가오는 행사가 뭐가 있어?",
      input: "",
      output: "다가오는 행사 일정을 확인해드리겠습니다. 이벤트 목록을 확인해주세요.",
    },
    {
      instruction: "너는 누구야?",
      input: "",
      output: "저는 JBSW 통합 정보 플랫폼의 챗봇 어시스턴트입니다. 공지사항, 이벤트, 행사 등에 대한 정보를 제공해드립니다.",
    },
    {
      instruction: "안녕",
      input: "",
      output: "안녕하세요! JBSW 챗봇입니다. 무엇을 도와드릴까요?",
    },
  ];
  trainingData.push(...generalQA);

  console.log(`  ✅ ${trainingData.length}건 생성 완료`);
  return trainingData;
}

/**
 * JSONL 형식으로 저장
 */
function saveAsJsonl(data, filename) {
  const filepath = path.join(dataDir, filename);
  const jsonl = data.map((item) => JSON.stringify(item)).join("\n");
  fs.writeFileSync(filepath, jsonl, "utf-8");
  console.log(`  💾 저장됨: ${filepath}`);
}

/**
 * JSON 형식으로 저장
 */
function saveAsJson(data, filename) {
  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  💾 저장됨: ${filepath}`);
}

/**
 * 메인 실행
 */
async function main() {
  console.log("🚀 Firebase 데이터 추출 시작\n");

  try {
    // 데이터 추출
    const notices = await fetchNotices(1000);
    const events = await fetchEvents(1000);

    // 원본 데이터 저장
    saveAsJson(notices, "notices.json");
    saveAsJson(events, "events.json");

    // 학습 데이터 생성 및 저장
    const trainingData = generateTrainingData(notices, events);
    saveAsJsonl(trainingData, "training_data.jsonl");

    console.log("\n✅ 데이터 추출 완료!");
    console.log(`\n📁 출력 파일:`);
    console.log(`   - data/notices.json`);
    console.log(`   - data/events.json`);
    console.log(`   - data/training_data.jsonl (Fine-tuning용)`);
    console.log(`\n📊 통계:`);
    console.log(`   - 공지사항: ${notices.length}건`);
    console.log(`   - 이벤트: ${events.length}건`);
    console.log(`   - 학습 데이터: ${trainingData.length}건`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();

