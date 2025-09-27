import { GeminiAnalysisResult } from "../../types";
import { extractTextFromCandidates, splitTextAndJson } from "./geminiParser";
import { toInlineData } from "./geminiBase64";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-lite";


export async function analyzePosterImage(input: { uri: string }): Promise<GeminiAnalysisResult> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY (or EXPO_PUBLIC_GEMINI_API_KEY)");

  //prompt 재작성 필요함.
  const prompt = `다음 포스터 이미지를 분석해 아래 요구를 충족해.
반드시 한국어로 작성.

요구 사항:
1) TEXT: 사람이 읽기 좋은 요약(2~4문장)
2) JSON: 아래 스키마를 따를 것
   - postTitle: 정확히 이 형식
     "[기관명 또는 주최기관 명](채용정보|공모전|해커톤|학습) [YYYY-MM-DD]"
     - 기관명/주최기관은 원문에서 가능한 한 정확히
     - 카테고리는 채용/공모전/해커톤/세미나/강연 등에 따라 적절히 선택
     - 마감일은 지원 마감일(없으면 행사 종료일, 없으면 시작일)
   - title: 포스트 본문용 핵심 제목(최대 40자)
   - summary: 한 줄 요약(최대 120자)
   - eventStart, eventEnd, applyStart, applyEnd: YYYY-MM-DD
   - location, prize, contactEmail, contactPhone, links: 가능하면 채움(없으면 키 생략)

반환 형식(그대로 지킬 것):
<TEXT>
<JSON>

JSON 스키마 예시:
{"postTitle":"...","title":"...","summary":"...","eventStart":"YYYY-MM-DD","eventEnd":"YYYY-MM-DD","applyStart":"YYYY-MM-DD","applyEnd":"YYYY-MM-DD","location":"...","prize":"...","contactEmail":"...","contactPhone":"...","links":["..."]}
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
  // postTitle: 모델이 생성한 값을 우선 사용, 없으면 간이 파생
  let postTitle: string | undefined = (extracted as any)?.postTitle || undefined;
  if (!postTitle && extracted) {
    const orgName = extracted?.title?.split(" ")[0] || ""; // 간이 추정
    const category = "채용정보"; // TODO: 태그/문맥 기반 분류 로직 확장
    const date = extracted.applyEnd || extracted.eventEnd || extracted.eventStart || "";
    if (orgName && date) postTitle = `${orgName} (${category}) ${date}`;
  }
  if (postTitle) console.log("[AI] postTitle(image):", postTitle);
  return { rawText, extracted: extracted ? { ...extracted, postTitle } as any : undefined } as any;
}

// 텍스트 전용 분석: 이미지 없이 공고/포스터의 텍스트 원문만 전달하여 분석
export async function analyzePosterText(input: { text: string }): Promise<GeminiAnalysisResult> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY (or EXPO_PUBLIC_GEMINI_API_KEY)");

  const prompt = `다음 공고/포스터 텍스트를 분석해 아래 요구를 충족해.
반드시 한국어로 작성.

요구 사항:
1) TEXT: 사람이 읽기 좋은 요약(2~4문장)
2) JSON: 아래 스키마를 따를 것
   - postTitle: 정확히 이 형식
     "[기관명 또는 주최기관 명](채용정보|공모전|해커톤|학습) [YYYY-MM-DD]"
     - 기관명/주최기관은 원문에서 가능한 한 정확히
     - 카테고리는 채용/공모전/해커톤/세미나/강연 등에 따라 적절히 선택
     - 마감일은 지원 마감일(없으면 행사 종료일, 없으면 시작일)
   - title: 포스트 본문용 핵심 제목(최대 40자)
   - summary: 한 줄 요약(최대 120자)
   - eventStart, eventEnd, applyStart, applyEnd: YYYY-MM-DD
   - location, prize, contactEmail, contactPhone, links: 가능하면 채움(없으면 키 생략)

반환 형식(그대로 지킬 것):
<TEXT>
<JSON>

JSON 스키마 예시:
{"postTitle":"...","title":"...","summary":"...","eventStart":"YYYY-MM-DD","eventEnd":"YYYY-MM-DD","applyStart":"YYYY-MM-DD","applyEnd":"YYYY-MM-DD","location":"...","prize":"...","contactEmail":"...","contactPhone":"...","links":["..."]}
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
  let postTitle: string | undefined = (extracted as any)?.postTitle || undefined;
  if (!postTitle && extracted) {
    const orgName = extracted?.title?.split(" ")[0] || "";
    const category = "채용정보";
    const date = extracted.applyEnd || extracted.eventEnd || extracted.eventStart || "";
    if (orgName && date) postTitle = `${orgName} (${category}) ${date}`;
  }
  if (postTitle) console.log("[AI] postTitle(text):", postTitle);
  return { rawText, extracted: extracted ? { ...extracted, postTitle } as any : undefined } as any;
}


