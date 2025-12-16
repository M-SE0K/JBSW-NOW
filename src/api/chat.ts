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
  let baseUrl = process.env.EXPO_PUBLIC_PROXY_URL || "http://localhost:4000";
  
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
    const systemPrompt = `당신은 JBSW 통합 정보 플랫폼의 챗봇 어시스턴트입니다. 
사용자의 질문에 친절하고 정확하게 답변해주세요.

${ragContext}

위 정보를 바탕으로 사용자의 질문에 답변해주세요. 
정보가 없는 경우 "관련 정보를 찾을 수 없습니다"라고 답변하세요.`;

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
          num_predict: 500,
        },
      },
      {
        timeout: 60000, // 1분 타임아웃
      }
    );

    const assistantMessage = response.data?.message?.content || "";
    
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


