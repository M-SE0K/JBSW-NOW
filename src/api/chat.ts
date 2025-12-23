import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { ChatAskRequest, ChatAskResponse } from "../types";
import {
  retrieveRelevantDocuments,
  formatRAGContext,
  extractCitations,
} from "./rag";

// Ollama 모델 설정 (환경변수로 변경 가능)
// 사용 가능한 모델: llama3.1:8b, llama3.2, qwen2.5:7b 등
const OLLAMA_MODEL = process.env.EXPO_PUBLIC_OLLAMA_MODEL || "llama3.1:8b";

// 프록시 서버 URL 설정
// 모바일에서는 localhost 대신 개발 서버의 IP를 사용
function getProxyUrl(): string {
  let baseUrl = process.env.EXPO_PUBLIC_PROXY_URL || "http://192.168.45.4:4000";
  // let baseUrl = process.env.EXPO_PUBLIC_PROXY_URL || "http://localhost:4000";
  
  // 환경 변수에서 포트 추출 (기본값: 4000)
  const urlMatch = baseUrl.match(/http:\/\/([^:]+):?(\d+)?/);
  const host = urlMatch?.[1] || "localhost";
  const port = urlMatch?.[2] || "4000";
  
  // localhost를 사용하는 경우 (모바일에서는 작동하지 않음)
  if (host === "localhost" || host === "127.0.0.1") {
    // 웹에서는 localhost 사용
    if (Platform.OS === "web") {
      return `http://localhost:${port}`;
    }
    
    // 모바일에서는 Expo 개발 서버의 IP 주소 사용
    const debuggerHost = Constants.expoConfig?.hostUri?.split(":")[0] || 
                         Constants.expoConfig?.extra?.host;
    
    if (debuggerHost && debuggerHost !== "localhost" && debuggerHost !== "127.0.0.1") {
      return `http://${debuggerHost}:${port}`;
    }
    
    // IP를 찾을 수 없으면 localhost 유지 (시뮬레이터에서는 작동할 수 있음)
    return `http://localhost:${port}`;
  }
  
  // 이미 IP 주소가 설정되어 있으면 그대로 사용
  return baseUrl;
}

const PROXY_URL = getProxyUrl();

// 대화 히스토리 관리 (간단한 메모리 기반)
let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

/**
 * Ollama를 사용한 챗봇 질문 (RAG 통합)
 */
export async function askChat(payload: ChatAskRequest): Promise<ChatAskResponse> {
  try {
    // RAG: 관련 문서 검색
    const relevantDocs = await retrieveRelevantDocuments(payload.query, 5);
    const ragContext = formatRAGContext(relevantDocs);
    const citations = extractCitations(relevantDocs);

    // 사용자 메시지 추가
    conversationHistory.push({
      role: "user",
      content: payload.query,
    });

    // 시스템 프롬프트 (RAG 컨텍스트 포함)
    const systemPrompt = `당신은 JBSW 통합 정보 플랫폼의 전문적이고 친절한 챗봇 어시스턴트입니다.

**답변 작성 규칙:**

1. **구조화된 형식**
   - 제목은 ## (h2)로 시작
   - 핵심 정보는 **볼드**로 강조
   - 리스트는 - 또는 1. 형식 사용
   - 각 섹션은 명확하게 구분

2. **답변 템플릿 (공지사항/채용 정보)**
   \`\`\`
   ## [제목]
   
   **📅 기간:** [날짜 정보]
   **🔗 원문:** [링크]
   
   [간단한 요약 (1-2문장)]
   
   ### 주요 내용
   - [핵심 정보 1]
   - [핵심 정보 2]
   - [핵심 정보 3]
   
   ### 상세 정보
   [상세 설명]
   \`\`\`

3. **스타일 가이드**
   - 자연스러운 말투 유지 ("~해요", "~입니다")
   - 불필요한 반복 제거
   - 날짜 형식: "2025년 9월 17일 (수) ~ 10월 12일 (일)"
   - 이모지는 섹션 구분에만 사용 (📅, 🔗, ⏰ 등)
   - URL은 마크다운 링크 형식: [링크 텍스트](URL)

4. **정보 정리**
   - 긴 내용은 요약하여 핵심만 전달
   - 중복 정보 제거
   - 읽기 쉽게 문단 구분

제공된 정보:
${ragContext}

위 정보를 바탕으로 깔끔하고 전문적인 답변을 작성해주세요.
정보가 없는 경우: "죄송해요, 관련 정보를 찾지 못했어요. 다른 키워드로 검색해보시거나, 좀 더 구체적으로 질문해주시면 도와드릴게요!"`;

    // Ollama API 호출 (프록시 서버를 통해)
    const response = await axios.post(
      `${PROXY_URL}/api/ollama/chat`,
      {
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
        ],
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 300, // 500 -> 300으로 줄여서 응답 시간 단축
        },
      },
      {
        timeout: 120000, // 2분 타임아웃 (배치 처리로 부하가 줄어들어 더 긴 타임아웃 가능)
      }
    );

    let assistantMessage = response.data?.message?.content || "";
    
    // 답변 후처리: 더 읽기 쉽게 포맷팅
    assistantMessage = formatChatResponse(assistantMessage);
    
    // 어시스턴트 응답을 히스토리에 추가
    if (assistantMessage) {
      conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });
      
      // 히스토리 길이 제한 (최근 10개 대화만 유지)
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
    }

    return {
      answer: assistantMessage || "답변을 생성하지 못했습니다.",
      citations,
    };
  } catch (e: any) {
    console.error("[Chat] Ollama request failed:", e);
    console.error("[Chat] Proxy URL:", PROXY_URL);
    
    // Network Error 처리 (모바일에서 localhost 접근 불가)
    if (e.message?.includes("Network Error") || e.code === "ERR_NETWORK" || e.code === "ECONNREFUSED") {
      return {
        answer: `프록시 서버에 연결할 수 없습니다.\n\n프록시 서버가 실행 중인지 확인하세요:\n\nnpm run proxy\n\n또는:\nnode server/proxy.js\n\n현재 연결 시도 URL: ${PROXY_URL}`,
        citations: [],
      };
    }
    
    // 에러 메시지에 따라 다른 응답 제공
    if (e.code === "ECONNREFUSED" || e.message?.includes("connect")) {
      return {
        answer: "Ollama 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.",
        citations: [],
      };
    }
    
    if (e.response?.status === 404) {
      const errorData = e.response?.data;
      const suggestion = errorData?.suggestion || `모델 '${OLLAMA_MODEL}'을 찾을 수 없습니다.`;
      return {
        answer: `${suggestion}\n\n모델 다운로드:\nnode scripts/download-ollama-model.mjs ${OLLAMA_MODEL}\n\n또는:\nollama pull ${OLLAMA_MODEL}`,
        citations: [],
      };
    }
    
    if (e.response?.status === 503) {
      const errorData = e.response?.data;
      return {
        answer: errorData?.suggestion || "Ollama 서버에 연결할 수 없습니다. 프록시 서버와 Ollama 서버가 실행 중인지 확인해주세요.",
        citations: [],
      };
    }

    return {
      answer: "잠시 문제가 발생했어요. 조금 뒤에 다시 시도해주세요.",
      citations: [],
    };
  }
}

/**
 * 대화 히스토리 초기화
 */
export function clearChatHistory() {
  conversationHistory = [];
}

/**
 * 채팅 답변 포맷팅: 더 읽기 쉽고 깔끔하게 변환
 */
function formatChatResponse(text: string): string {
  if (!text) return text;
  
  let formatted = text;
  
  // 불필요한 반복 제거 (예: "이것은... 이것은..." 같은 패턴)
  formatted = formatted.replace(/(.{10,}?)\1{2,}/g, "$1");
  
  // 날짜 형식 개선 (YYYY.MM.DD -> YYYY년 MM월 DD일)
  formatted = formatted.replace(
    /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/g,
    (match, year, month, day) => {
      const monthNames = ["", "1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);
      const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
      const date = new Date(year, m - 1, d);
      const weekday = weekdays[date.getDay()];
      return `${year}년 ${monthNames[m] || `${month}월`} ${d}일 (${weekday})`;
    }
  );
  
  // 요일 표시 개선 ((화) -> (화))
  formatted = formatted.replace(/\(([월화수목금토일])\)/g, "($1)");
  
  // 마크다운 리스트 정리 (일관된 형식)
  formatted = formatted.replace(/\n\s*[-•]\s+/g, "\n- ");
  formatted = formatted.replace(/\n\s*(\d+)\.\s+/g, "\n$1. ");
  
  // 헤더 앞뒤 공백 정리
  formatted = formatted.replace(/\n{1,2}(#{1,6}\s+)/g, "\n\n$1");
  formatted = formatted.replace(/(#{1,6}\s+[^\n]+)\n{1,2}/g, "$1\n");
  
  // 연속된 줄바꿈 정리 (최대 2개)
  formatted = formatted.replace(/\n{3,}/g, "\n\n");
  
  // 문단 사이 일관된 간격 유지
  formatted = formatted.replace(/([^\n])\n([^\n#])/g, (match, p1, p2) => {
    // 리스트나 헤더가 아닌 경우만 처리
    if (!p2.match(/^[-•\d#]/)) {
      return `${p1}\n\n${p2}`;
    }
    return match;
  });
  
  // 불필요한 공백 제거
  formatted = formatted.replace(/[ \t]+/g, " ");
  formatted = formatted.replace(/ \n/g, "\n");
  formatted = formatted.replace(/\n /g, "\n");
  
  // 문장 끝 정리
  formatted = formatted.trim();
  
  return formatted;
}


