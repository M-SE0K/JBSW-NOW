import { GeminiAnalysisResult, ContestFromImage } from "../types";

// 환경변수: app.config.ts에서 EXPO_PUBLIC_GEMINI_API_KEY 로 노출 권장
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_VISION_MODEL = process.env.EXPO_PUBLIC_GEMINI_VISION_MODEL ?? "gemini-1.5-flash";

// 이미지(URI 또는 Blob/Base64)를 Gemini에 전송해 포스터를 분석
// Note: React Native 환경에서 로컬 파일/HTTP URL 모두 지원하도록 분기 처리
export async function analyzePosterImage(input: { uri: string }): Promise<GeminiAnalysisResult> {
  if (!GEMINI_API_KEY) throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");

  // Google Generative Language API - Multimodal input(JSON payload)
  // See: https://ai.google.dev/gemini-api/docs

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
          { text: prompt },
          { inline_data: await toInlineData(input.uri) },
        ],
      },
    ],
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }
  const json = await res.json();
  const text = extractTextFromCandidates(json);

  // TEXT/JSON 분리 파싱
  let rawText = text.trim();
  let extracted: ContestFromImage | undefined;
  const jsonStart = rawText.indexOf("\n{");
  if (jsonStart >= 0) {
    const maybeJson = rawText.slice(jsonStart);
    try {
      extracted = JSON.parse(maybeJson);
      rawText = rawText.slice(0, jsonStart).trim();
    } catch (_) {
      // ignore parse error, return rawText only
    }
  }

  return { rawText, extracted };
}

async function toInlineData(uri: string): Promise<{ mime_type: string; data: string }> {
  // HTTP(S) 원격 이미지면 그대로 fetch하여 base64 변환
  if (uri.startsWith("http")) {
    const r = await fetch(uri);
    if (!r.ok) throw new Error(`Failed to fetch image: ${r.status}`);
    const blob = await r.blob();
    const base64 = await blobToBase64(blob);
    const mime = blob.type || "image/png";
    return { mime_type: mime, data: base64 };
  }
  // file:// 또는 asset 등은 React Native FS/Expo FileSystem 사용 권장
  // 여기서는 간단히 fetch 시도
  const r = await fetch(uri);
  const blob = await r.blob();
  const base64 = await blobToBase64(blob);
  const mime = blob.type || "image/png";
  return { mime_type: mime, data: base64 };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractTextFromCandidates(json: any): string {
  const parts: string[] = [];
  const cands = json?.candidates ?? [];
  for (const c of cands) {
    const p = c?.content?.parts ?? [];
    for (const part of p) {
      if (typeof part?.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}


