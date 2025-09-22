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


