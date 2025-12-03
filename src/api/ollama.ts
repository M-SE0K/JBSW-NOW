import axios from "axios";

const OLLAMA_BASE_URL = process.env.EXPO_PUBLIC_OLLAMA_URL || "http://localhost:11434";

export interface OllamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Ollama API 클라이언트
 */
class OllamaClient {
  private baseURL: string;

  constructor(baseURL: string = OLLAMA_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * 사용 가능한 모델 목록 조회
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error("[Ollama] Failed to list models:", error);
      throw error;
    }
  }

  /**
   * 모델 다운로드
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/pull`,
        { name: modelName },
        {
          timeout: 300000, // 5분 타임아웃
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[Ollama] Failed to pull model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * 채팅 완료 (비스트리밍)
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/chat`,
        {
          ...request,
          stream: false,
        },
        {
          timeout: 60000, // 1분 타임아웃
        }
      );
      return response.data;
    } catch (error) {
      console.error("[Ollama] Chat request failed:", error);
      throw error;
    }
  }

  /**
   * 채팅 스트리밍 (SSE)
   */
  async *chatStream(request: OllamaChatRequest): AsyncGenerator<string, void, unknown> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                yield data.message.content;
              }
              if (data.done) {
                return;
              }
            } catch (e) {
              // JSON 파싱 실패 시 무시
            }
          }
        }
      }
    } catch (error) {
      console.error("[Ollama] Chat stream failed:", error);
      throw error;
    }
  }

  /**
   * 모델이 존재하는지 확인
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some((m) => m.name === modelName);
    } catch (error) {
      console.error("[Ollama] Failed to check model:", error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const ollamaClient = new OllamaClient();
