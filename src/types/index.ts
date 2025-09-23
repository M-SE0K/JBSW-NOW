export type Org = {
  id: string;
  name: string;
  logoUrl: string | null;
  homepageUrl?: string | null;
};

export type EventAI = {
  summary?: string | null;
  recommendation?: string | null;
};

export type Event = {
  id: string;
  title: string;
  summary?: string | null;
  startAt: string; // ISO
  endAt?: string | null; // ISO
  location?: string | null;
  tags?: string[];
  org: Org;
  sourceUrl?: string | null;
  ai?: EventAI | null;
};

export type PagedResponse<T> = {
  data: T[];
  nextCursor?: string | null;
};

export type ChatAskRequest = {
  query: string;
};

export type ChatAskResponse = {
  answer: string;
  citations?: string[];
};

// Gemini 추출 JSON 스키마(포스터 분석용, 필드 일부만 선택)
export type ContestFromImage = {
  title?: string;
  summary?: string;
  eventStart?: string; // ISO YYYY-MM-DD
  eventEnd?: string;   // ISO YYYY-MM-DD
  applyStart?: string; // ISO
  applyEnd?: string;   // ISO
  location?: string;
  prize?: string;
  contactEmail?: string;
  contactPhone?: string;
  links?: string[];    // 신청 링크 등
};

export type GeminiAnalysisResult = {
  rawText: string;           // 모델이 생성한 원문 텍스트
  extracted?: ContestFromImage; // JSON 파싱이 성공했다면 구조화 결과
};


