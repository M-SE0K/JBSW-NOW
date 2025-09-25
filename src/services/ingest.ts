import "../db/firebase";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { analyzePosterImage, analyzePosterText } from "../api/gemini/gemini";
import { ContestFromImage, GeminiAnalysisResult, Org } from "../types";

export type IngestInputText = {
  text: string;
  sourceUrl?: string | null;
  org?: Org;
};

export type IngestInputImage = {
  uri: string; // http(s) 또는 file:///asset URI
  sourceUrl?: string | null;
  org?: Org;
};

export type IngestResult = {
  eventId: string;
  analysis: GeminiAnalysisResult;
  tags: string[];
};

const DEFAULT_ORG: Org = {
  id: "unknown",
  name: "Unknown",
  logoUrl: null,
  homepageUrl: null,
};

export async function processCrawledText(input: IngestInputText): Promise<IngestResult> {
  const analysis = await analyzePosterText({ text: input.text });
  const tags = inferTags(analysis);
  const docId = await saveToFirestore({
    sourceUrl: input.sourceUrl ?? null,
    analysis,
    tags,
    org: input.org ?? DEFAULT_ORG,
  });
  return { eventId: docId, analysis, tags };
}

export async function processCrawledImage(input: IngestInputImage): Promise<IngestResult> {
  const analysis = await analyzePosterImage({ uri: input.uri });
  const tags = inferTags(analysis);
  const docId = await saveToFirestore({
    sourceUrl: input.sourceUrl ?? null,
    analysis,
    tags,
    org: input.org ?? DEFAULT_ORG,
  });
  return { eventId: docId, analysis, tags };
}

function inferTags(analysis: GeminiAnalysisResult): string[] {
  const text = `${analysis.rawText}\n${JSON.stringify(analysis.extracted ?? {})}`.toLowerCase();
  const tags = new Set<string>();
  const add = (t: string) => tags.add(t);

  if (/경진대회|콘테스트|해커톤|대회/.test(text)) add("contest");
  if (/채용|인턴|공채|커리어|잡페어/.test(text)) add("career");
  if (/세미나|강연|특강|워크숍|콘퍼런스|컨퍼런스/.test(text)) add("seminar");
  if (/장학|장학금|scholar/.test(text)) add("scholarship");
  if (/신청|접수|등록|apply|register/.test(text)) add("apply");
  if (/마감|deadline|마감일/.test(text)) add("deadline");
  if (/상금|prize|시상/.test(text)) add("prize");

  // 날짜 존재 시 일정성 태그 부여
  const ex = analysis.extracted;
  if (ex?.eventStart || ex?.eventEnd) add("scheduled");

  return Array.from(tags);
}

async function saveToFirestore(params: {
  sourceUrl: string | null;
  analysis: GeminiAnalysisResult;
  tags: string[];
  org: Org;
}): Promise<string> {
  const db = getFirestore();
  const ex: ContestFromImage | undefined = params.analysis.extracted;

  // 필드 매핑: 추출값이 없을 때 합리적 기본값 사용
  const title = ex?.title || deriveTitle(params.analysis.rawText);
  const summary = ex?.summary || trimSummary(params.analysis.rawText, 300);
  const startAt = ex?.eventStart || null;
  const endAt = ex?.eventEnd || null;

  const docData = {
    title,
    summary,
    startAt,
    endAt,
    location: ex?.location ?? null,
    prize: ex?.prize ?? null,
    contactEmail: ex?.contactEmail ?? null,
    contactPhone: ex?.contactPhone ?? null,
    links: ex?.links ?? [],
    tags: params.tags,
    org: params.org,
    sourceUrl: params.sourceUrl,
    ai: {
      rawText: params.analysis.rawText,
      extracted: ex ?? null,
      model: "gemini-1.5-flash-latest",
      processedAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as const;

  const ref = await addDoc(collection(db, "events"), docData);
  return ref.id;
}

function deriveTitle(raw: string): string {
  const firstLine = (raw || "").split(/\n+/)[0]?.trim() || "제목 미상";
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;
}

function trimSummary(raw: string, max: number): string {
  const t = (raw || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 3) + "..." : t;
}


