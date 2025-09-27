// 클라이언트 측 공통 검색 유틸리티

export function normalize(text?: string | null): string {
  return (text || "").toLowerCase().trim();
}

export function tokenize(query: string): string[] {
  return query.split(/\s+/).filter(Boolean);
}

export function makeHaystack<T extends Record<string, any>>(item: T, fields: Array<keyof T>): string {
  const joined = fields
    .map((f) => {
      const v = item[f];
      return typeof v === "string" ? v : Array.isArray(v) ? v.join(" ") : "";
    })
    .join(" ");
  return normalize(joined);
}

// 모든 단어가 포함되는 항목만 반환 (AND 매칭)
export function searchByAllWords<T extends Record<string, any>>(
  items: T[],
  query: string,
  fields: Array<keyof T>
): T[] {
  const q = normalize(query);
  if (!q) return items;
  const tokens = tokenize(q);
  return items.filter((item) => {
    const hay = makeHaystack(item, fields);
    return tokens.every((t) => hay.includes(t));
  });
}

// 날짜 문자열(예: 2025.07.30 / 2025-07-30 / 2025. 7. 30.)을 ms로 변환
export function parseDateMs(s?: string | null): number {
  if (!s || typeof s !== "string") return 0;
  const m = s.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, Math.max(0, mo - 1), d, 0, 0, 0);
    return dt.getTime();
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

export function sortByDateDesc<T>(items: T[], getDateString: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => parseDateMs(getDateString(b)) - parseDateMs(getDateString(a)));
}


