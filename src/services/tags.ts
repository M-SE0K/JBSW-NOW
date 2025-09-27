import type { Event } from "../types";
import { analyzePosterImage, analyzePosterText } from "../api/gemini/gemini";

export const ALLOWED_TAGS = [
  "수강",
  "졸업",
  "학사",
  "일반",
  "대학원",
  "취업",
  "공모전",
  "봉사활동",
  "교내활동",
  "대외활동",
] as const;

export type AllowedTag = typeof ALLOWED_TAGS[number];

const cache = new Map<string, AllowedTag[]>();

function clean(text?: string | null): string {
  if (!text || typeof text !== "string") return "";
  return String(text).replace(/\s+/g, " ").trim();
}

function pickTopTags(tags: AllowedTag[]): AllowedTag[] {
  const uniq: AllowedTag[] = [];
  for (const t of tags) {
    if (!uniq.includes(t)) uniq.push(t);
    if (uniq.length >= 3) break;
  }
  return uniq.length > 0 ? uniq : ["일반"];
}

function keywordToTags(text: string): AllowedTag[] {
  const src = text.toLowerCase();
  const out: AllowedTag[] = [];

  // 취업
  if (/(채용|인턴|취업|공채|경력|신입|recruit|모집공고|산학협력)/i.test(src)) out.push("취업");
  // 공모전
  if (/(공모전|해커톤|대회|콘테스트|챌린지)/i.test(src)) out.push("공모전");
  // 봉사활동
  if (/(봉사|자원봉사|봉사활동)/i.test(src)) out.push("봉사활동");
  // 대학원
  if (/(대학원|석사|박사|연구실|랩\b|seminar|세미나)/i.test(src)) out.push("대학원");
  // 수강
  if (/(수강|강의|과목|수업|청강|교양|전공과목|강좌)/i.test(src)) out.push("수강");
  // 졸업
  if (/(졸업|학위수여|논문|졸업요건|학위)/i.test(src)) out.push("졸업");
  // 학사
  if (/(학사|휴학|복학|전과|편입|성적|수강신청|등록금|학적|성적정정|장학생||학생||재(복)학생)/i.test(src)) out.push("학사");
  // 교내활동
  if (/(멘토|멘티|TA)/i.test(src)) out.push("교내활동");
  // 대외활동
  if (/(대외활동|봉사|자원봉사|봉사활동)/i.test(src)) out.push("대외활동");
  
  return pickTopTags(out);
}

async function analyzeEventWithGemini(event: Event): Promise<{ raw: string; mergedText: string } | null> {
  try {
    const title = clean(event.title);
    const summary = clean(event.summary);
    const baseText = [title, summary].filter(Boolean).join("\n");

    if (event.posterImageUrl && clean(event.posterImageUrl)) {
      const ai = await analyzePosterImage({ uri: event.posterImageUrl! });
      const raw = clean(ai?.rawText);
      const ex = ai?.extracted;
      const merged = [
        baseText,
        raw,
        clean(ex?.title),
        clean(ex?.summary),
        clean(ex?.location),
        clean(ex?.prize),
        (ex?.links || []).join(" \n"),
      ]
        .filter(Boolean)
        .join("\n");
      return { raw, mergedText: merged };
    }

    const effectiveText = baseText || "";
    if (!effectiveText) return null;
    const ai = await analyzePosterText({ text: effectiveText });
    const raw = clean(ai?.rawText);
    const ex = ai?.extracted;
    const merged = [
      baseText,
      raw,
      clean(ex?.title),
      clean(ex?.summary),
      clean(ex?.location),
      clean(ex?.prize),
      (ex?.links || []).join(" \n"),
    ]
      .filter(Boolean)
      .join("\n");
    return { raw, mergedText: merged };
  } catch (e) {
    console.warn("[TAGS] Gemini analyze error", e);
    return null;
  }
}

export async function classifyEventTags(event: Event): Promise<AllowedTag[]> {
  const cacheKey = event.id;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const title = clean(event.title);
  const summary = clean(event.summary);
  const quick = keywordToTags([title, summary].filter(Boolean).join(" \n "));

  // 빠른 키워드로 충분하면 그대로 사용
  if (quick && quick.length > 0 && !(quick.length === 1 && quick[0] === "일반")) {
    cache.set(cacheKey, quick);
    return quick;
  }

  // Gemini 분석 병행 시도
  const ai = await analyzeEventWithGemini(event);
  if (ai) {
    const aiTags = keywordToTags(ai.mergedText);
    const merged = pickTopTags([...(quick || []), ...aiTags]);
    cache.set(cacheKey, merged);
    return merged;
  }

  cache.set(cacheKey, quick);
  return quick;
}

export async function enrichEventsWithTags(events: Event[]): Promise<Event[]> {
  const enriched = await Promise.all(
    events.map(async (ev) => {
      try {
        const tags = await classifyEventTags(ev);
        return { ...ev, tags } as Event;
      } catch {
        return { ...ev, tags: ["일반"] } as Event;
      }
    })
  );
  return enriched;
}


