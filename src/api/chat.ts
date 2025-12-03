import axios from "axios";
import { ChatAskRequest, ChatAskResponse } from "../types";

// Ollama 모델 설정 (환경변수로 변경 가능)
// 사용 가능한 모델: llama3.1:8b, llama3.2, qwen2.5:7b 등
const OLLAMA_MODEL = process.env.EXPO_PUBLIC_OLLAMA_MODEL || "llama3.1:8b";
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || "http://localhost:4001";

// 대화 히스토리 관리 (간단한 메모리 기반)
let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

/**
 * Ollama를 사용한 챗봇 질문
 */
export async function askChat(payload: ChatAskRequest): Promise<ChatAskResponse> {
  try {
    // 사용자 메시지 추가
    conversationHistory.push({
      role: "user",
      content: payload.query,
    });

    // 시스템 프롬프트 (선택사항)
    const systemPrompt = `당신은 JBSW 통합 정보 플랫폼의 챗봇 어시스턴트입니다. 
사용자의 질문에 친절하고 정확하게 답변해주세요. 
공지사항, 이벤트, 행사 등에 대한 정보를 제공할 수 있습니다.`;

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
      citations: [],
    };
  } catch (e: any) {
    console.error("[Chat] Ollama request failed:", e);
    
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


