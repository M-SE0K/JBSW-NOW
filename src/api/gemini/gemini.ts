import { GeminiAnalysisResult } from "../../types";
import { extractTextFromCandidates, splitTextAndJson } from "./geminiParser";
import { toInlineData } from "./geminiBase64";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";


export async function analyzePosterImage(input: { uri: string }): Promise<GeminiAnalysisResult> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY (or EXPO_PUBLIC_GEMINI_API_KEY)");

  //prompt 재작성 필요함.
  const prompt = `다음 포스터 이미지에서 핵심 정보를 한국어로 요약한 후, JSON도 생성해.
반환 형식:
<TEXT>
<JSON>
JSON 스키마 예시:
{"title":"...","summary":"...","eventStart":"YYYY-MM-DD","eventEnd":"YYYY-MM-DD","applyStart":"YYYY-MM-DD","applyEnd":"YYYY-MM-DD","location":"...","prize":"...","contactEmail":"...","contactPhone":"...","links":["..."]}
날짜 형식은 반드시 YYYY-MM-DD 로 표준화.
없으면 키 생략.
`;

  const body = {
    contents: [
      {
        parts: [
          // 지시문(프롬프트)
          { text: prompt },
          // 여기서 실제 이미지를 읽어옵니다.
          // - input.uri가 http/https면 원격 이미지를 fetch → Blob → base64 변환
          // - file://, asset 등 로컬 URI면 RN/Expo 환경에서 fetch 시도(필요시 Expo FileSystem 권장)
          { inline_data: await toInlineData(input.uri) },
        ],
      },
    ],
  };

  // Gemini GenerateContent 엔드포인트 호출
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }
  const json = await res.json();
  // 후보 응답들에서 텍스트 부분만 모아 하나의 문자열로 결합
  const text = extractTextFromCandidates(json);
  // TEXT/JSON 분리 파싱
  const { rawText, extracted } = splitTextAndJson(text);
  return { rawText, extracted };
}

// 텍스트 전용 분석: 이미지 없이 공고/포스터의 텍스트 원문만 전달하여 분석
export async function analyzePosterText(input: { text: string }): Promise<GeminiAnalysisResult> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY (or EXPO_PUBLIC_GEMINI_API_KEY)");

  const prompt = `다음 공고/포스터 텍스트에서 핵심 정보를 한국어로 요약한 후, JSON도 생성해.
반환 형식:
<TEXT>
<JSON>
JSON 스키마 예시:
{"title":"...","summary":"...","eventStart":"YYYY-MM-DD","eventEnd":"YYYY-MM-DD","applyStart":"YYYY-MM-DD","applyEnd":"YYYY-MM-DD","location":"...","prize":"...","contactEmail":"...","contactPhone":"...","links":["..."]}
날짜 형식은 반드시 YYYY-MM-DD 로 표준화.
없으면 키 생략.
원문:
`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt + (input.text ?? "") },
        ],
      },
    ],
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }
  const json = await res.json();
  // 후보 응답들에서 텍스트 부분만 모아 하나의 문자열로 결합
  const textOut = extractTextFromCandidates(json);
  // TEXT/JSON 분리 파싱
  const { rawText, extracted } = splitTextAndJson(textOut);
  return { rawText, extracted };
}


