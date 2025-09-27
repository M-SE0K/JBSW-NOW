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
  const original = (mixedText || "").trim();

  // 1) JSON 먼저 추출: <JSON> 태그 내부에서 코드펜스/중괄호 모두 대응
  let extracted: ContestFromImage | undefined;
  let jsonMatched = false;
  try {
    const fenceMatch = original.match(/<JSON>[\s\S]*?```(?:json)?\s*([\s\S]*?)\s*```[\s\S]*?<\/JSON>/i);
    const bracesMatch = !fenceMatch && original.match(/<JSON>[\s\S]*?({[\s\S]*?})[\s\S]*?<\/JSON>/i);
    const directBraces = !fenceMatch && !bracesMatch && original.match(/({[\s\S]*})\s*$/);
    const jsonCandidate = (fenceMatch && fenceMatch[1]) || (bracesMatch && bracesMatch[1]) || (directBraces && directBraces[1]) || undefined;
    if (jsonCandidate) {
      extracted = JSON.parse(jsonCandidate);
      jsonMatched = true;
    }
  } catch (_) {
    // JSON 파싱 실패 시 extracted는 undefined로 유지
  }

  // 2) TEXT 추출: <TEXT> ... 구간 우선, 없으면 JSON 앞부분, 최종적으로 전체 본문
  let rawText = original;
  const textMatch = original.match(/<TEXT>([\s\S]*?)(?=<JSON>|<\/JSON>|$)/i);
  if (textMatch) {
    rawText = textMatch[1].trim();
  } else if (jsonMatched) {
    // JSON이 있었으면 JSON 시작 이전 부분을 사용 (가벼운 휴리스틱)
    const preJson = original.split(/<JSON>/i)[0] || original;
    rawText = preJson.trim();
  }

  return { rawText, extracted };
}


