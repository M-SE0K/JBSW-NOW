import { api } from "./client";
import { ChatAskRequest, ChatAskResponse } from "../types";

export async function askChat(payload: ChatAskRequest): Promise<ChatAskResponse> {
  try {
    const res = await api.post("/chat/ask", payload);
    const data = res.data as ChatAskResponse;
    if (!data?.answer) throw new Error("Invalid response");
    return data;
  } catch (e) {
    // Placeholder fallback
    return { answer: "백엔드 연결 대기 중입니다. 임시 답변입니다.", citations: [] };
  }
}


