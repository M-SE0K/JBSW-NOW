import { GeminiAnalysisResult, ContestFromImage } from "../types";
import { Asset } from "expo-asset";

// 환경변수: GEMINI_API_KEY 우선 사용, 없으면 EXPO_PUBLIC_GEMINI_API_KEY 폴백
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
// 모델은 고정 사용(환경변수 사용하지 않음)
const GEMINI_MODEL = "gemini-1.5-flash-latest";

// 이미지(URI 또는 Blob/Base64)를 Gemini에 전송해 포스터를 분석
// Note: React Native 환경에서 로컬 파일/HTTP URL 모두 지원하도록 분기 처리
// Note:
// - 이 함수는 "이미지 URI"를 인자로 받아 분석합니다.
//   (카메라 촬영 결과, 앨범/파일 선택기, 드래그&드롭, 또는 외부 이미지 URL 등에서 전달된 URI)
// - HTML 원문(URL/HTML 텍스트)은 현재 처리 대상이 아닙니다. 이미지 파일만 Gemini에 전달합니다.
//   HTML을 처리하려면 별도 API(예: 텍스트 파트로 HTML을 전송)로 확장하세요.
export async function analyzePosterImage(input: { uri: string }): Promise<GeminiAnalysisResult> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY (or EXPO_PUBLIC_GEMINI_API_KEY)");

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
          // 여기서 실제 이미지를 읽어옵니다.
          // - input.uri가 http/https면 원격 이미지를 fetch → Blob → base64 변환
          // - file://, asset 등 로컬 URI면 RN/Expo 환경에서 fetch 시도(필요시 Expo FileSystem 권장)
          { inline_data: await toInlineData(input.uri) },
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
  const textOut = extractTextFromCandidates(json);

  let rawText = textOut.trim();
  let extracted: ContestFromImage | undefined;
  const jsonStart = rawText.indexOf("\n{");
  if (jsonStart >= 0) {
    const maybeJson = rawText.slice(jsonStart);
    try {
      extracted = JSON.parse(maybeJson);
      rawText = rawText.slice(0, jsonStart).trim();
    } catch (_) {
      // ignore parse error
    }
  }
  return { rawText, extracted };
}

// TEST 전용 유틸: 번들된 에셋(app/img/poster1.png)을 바로 분석
// - 기존 로직을 변경하지 않고, 추가로 호출 가능한 헬퍼입니다.
export async function analyzePosterImageFromBundledAsset(): Promise<GeminiAnalysisResult> {
  const moduleAsset = Asset.fromModule(require("../../app/img/poster1.png"));
  try {
    // 웹/네이티브 모두에서 URI 확보를 보장하기 위해 다운로드 시도 (웹에서는 no-op)
    await moduleAsset.downloadAsync();
  } catch (_) {
    // 다운로드 실패는 무시하고 uri/localUri 우선 사용
  }
  const uri = moduleAsset.localUri ?? moduleAsset.uri;
  if (!uri) throw new Error("Failed to resolve URI for app/img/poster1.png");
  return await analyzePosterImage({ uri });
}

// 주어진 URI에서 바이너리 이미지 데이터를 읽어 base64로 인라인 전송 포맷으로 변환합니다.
// - http/https: 원격 이미지 다운로드 후 Blob→base64
// - file://, asset: 로컬 파일을 Blob→base64 (환경에 따라 Expo FileSystem 사용 권장)
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
  // 여기서는 간단히 fetch 시도(환경에 따라 동작이 다를 수 있음)
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


