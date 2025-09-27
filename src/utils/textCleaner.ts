/**
 * 크롤링 원문 텍스트를 앱에 적합하게 정제합니다.
 * - HTML 태그/스크립트 제거 및 기본 엔티티 디코딩
 * - 불필요한 공백/제어문자 정리, 줄바꿈 보존(블록 태그 → 줄바꿈)
 * - 간단한 푸터/꼬리표 제거, 최대 길이 제한
 */
export function cleanCrawledText(raw: string, options?: { maxLength?: number }): string {
  const max = options?.maxLength ?? 2000;
  let t = (raw || "");

  // 1) 스크립트/스타일 제거
  t = t.replace(/<script[\s\S]*?<\/script>/gi, "");
  t = t.replace(/<style[\s\S]*?<\/style>/gi, "");
  t = t.replace(/<TEXT[\s\S]*?<\/TEXT>/gi, "");
  t = t.replace(/<font[\s\S]*?<\/font>/gi, "");
  t = t.replace(/<a[\s\S]*?<\/a>/gi, "");
  t = t.replace(/<img[\s\S]*?<\/img>/gi, "");
  t = t.replace(/<video[\s\S]*?<\/video>/gi, "");
  t = t.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  t = t.replace(/<embed[\s\S]*?<\/embed>/gi, "");
  t = t.replace(/<object[\s\S]*?<\/object>/gi, "");
  t = t.replace(/<param[\s\S]*?<\/param>/gi, "");
  t = t.replace(/<applet[\s\S]*?<\/applet>/gi, "");
  t = t.replace(/<base[\s\S]*?<\/base>/gi, "");
  t = t.replace(/<link[\s\S]*?<\/link>/gi, "");
  t = t.replace(/<meta[\s\S]*?<\/meta>/gi, "");
  t = t.replace(/<title[\s\S]*?<\/title>/gi, "");
  t = t.replace(/<style[\s\S]*?<\/style>/gi, "");
  t = t.replace(/<script[\s\S]*?<\/script>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");
  t = t.replace(/<noframes[\s\S]*?<\/noframes>/gi, "");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  t = t.replace(/<noembed[\s\S]*?<\/noembed>/gi, "");

  // 2) 줄바꿈 보존을 위한 블록 태그를 개행으로 치환
  const blockTags = [
    "p","div","section","article","header","footer","ul","ol","li",
    "table","tr","td","th","h1","h2","h3","h4","h5","h6"
  ];
  for (const tag of blockTags) {
    const reOpen = new RegExp(`<${tag}[^>]*>`, "gi");
    const reClose = new RegExp(`</${tag}>`, "gi");
    t = t.replace(reOpen, "\n").replace(reClose, "\n");
  }
  // <br> 처리
  t = t.replace(/<br\s*\/?\s*>/gi, "\n");

  // 3) 남은 모든 태그 제거
  t = t.replace(/<[^>]+>/g, "");

  // 4) HTML 엔티티 기본 디코딩
  t = decodeBasicEntities(t);

  // 5) 제어문자/공백 정리
  t = t
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n") // 과도한 연속 개행 축소
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 6) 간단한 꼬리표/푸터 패턴 제거 예시
  t = t.replace(/(무단\s?배포\s?금지|All\s?rights\s?reserved).*/i, "").trim();

  // 6-1) 제목/문장 말미의 "새글" 꼬리표 제거
  // 예: "... 제목 새글", "... 제목 [새글]", "... 제목 - 새글", "... 제목 | 새 글"
  t = t.replace(/\s*(?:[\-\|·]\s*)?(?:[\[(]?\s*새\s*글\s*[\])]?|새\s*글)\s*$/i, "").trim();

  if (t.length > max) t = t.slice(0, max - 3) + "...";
  return t;
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // 숫자 엔티티(10진)
    .replace(/&#(\d+);/g, (_, d: string) => {
      const code = parseInt(d, 10);
      return isFinite(code) ? String.fromCharCode(code) : _;
    })
    // 숫자 엔티티(16진)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => {
      const code = parseInt(h, 16);
      return isFinite(code) ? String.fromCharCode(code) : _;
    });
}

/**
 * Gemini 스타일 마커가 포함된 rowText를 정규식으로 포스트용으로 정리합니다.
 * 예) "<TEXT> ... <JSON> ```json { ... } ``` </JSON>"
 */
export function formatRowTextForPost(raw: string): { text: string; jsonPretty?: string } {
  if (!raw) return { text: "" };
  let s = String(raw);

  // 외곽 큰따옴표 제거
  if (/^"[\s\S]*"$/.test(s)) s = s.slice(1, -1);

  // TEXT 부분 추출
  const mText = s.match(/<TEXT>([\s\S]*?)(?=<JSON>|<\/JSON>|$)/i);
  let textPart = mText ? mText[1] : s;

  // JSON 부분 추출 (코드펜스 우선)
  let jsonPretty: string | undefined;
  const mFence = s.match(/<JSON>[\s\S]*?```(?:json)?\s*([\s\S]*?)\s*```[\s\S]*?<\/JSON>/i);
  const mBraces = !mFence && s.match(/<JSON>[\s\S]*?({[\s\S]*?})[\s\S]*?<\/JSON>/i);
  const jsonCandidate = (mFence && mFence[1]) || (mBraces && mBraces[1]) || undefined;
  if (jsonCandidate) {
    try {
      const obj = JSON.parse(jsonCandidate);
      jsonPretty = JSON.stringify(obj, null, 2);
    } catch (_) {
      jsonPretty = undefined;
    }
  }

  // TEXT 정리
  textPart = cleanCrawledText(textPart, { maxLength: 4000 });

  return { text: textPart, jsonPretty };
}


