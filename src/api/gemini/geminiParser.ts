import type { ContestFromImage } from "../../types";

/**
 * Gemini 응답에서 텍스트 파트를 추출해 하나의 문자열로 합칩니다.
 */
export function extractTextFromCandidates(json: any): string {
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

/**
 * TEXT/JSON 복합 문자열에서 JSON 블록을 파싱해 분리합니다.
 * "\n{" 를 기준으로 JSON 시작을 탐지합니다.
 */
export function splitTextAndJson(mixedText: string): { rawText: string; extracted?: ContestFromImage } {
  let rawText = (mixedText || "").trim();
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


