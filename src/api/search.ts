import { api } from "./client";
import { Event, Org } from "../types";

export type SearchQuery = {
  q: string;
  type?: "all" | "events" | "organizations";
  cursor?: string;
};

export type SearchResult = {
  events: Event[];
  organizations: Org[];
  nextCursor?: string | null;
};

export async function searchContent(params: SearchQuery): Promise<SearchResult> {
  try {
    const res = await api.get("/search", { 
      params: { 
        q: params.q,
        type: params.type || "all",
        cursor: params.cursor 
      } 
    });
    
    // TODO: 실제 API 응답 구조에 맞게 수정
    return {
      events: res.data.events || [],
      organizations: res.data.organizations || [],
      nextCursor: res.data.nextCursor || null,
    };
  } catch (error) {
    // TODO: 실제 API가 준비되면 제거
    console.log("검색 API 호출 실패, 모의 데이터 사용:", error);
    return getMockSearchResults(params.q);
  }
}

// 최근 검색어 관련 함수들
export async function getRecentSearches(): Promise<string[]> {
  try {
    // TODO: 로컬 스토리지나 API에서 최근 검색어 가져오기
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem("recentSearches");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(query: string): Promise<void> {
  try {
    // TODO: 로컬 스토리지에 최근 검색어 저장
    const recent = await getRecentSearches();
    const filtered = recent.filter((item) => item !== query);
    const updated = [query, ...filtered].slice(0, 10); // 최대 10개만 저장
    
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("recentSearches", JSON.stringify(updated));
    }
  } catch (error) {
    console.error("최근 검색어 저장 실패:", error);
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("recentSearches");
    }
  } catch (error) {
    console.error("최근 검색어 삭제 실패:", error);
  }
}

// 모의 검색 결과 (개발용)
function getMockSearchResults(query: string): SearchResult {
  const mockEvents: Event[] = [
    {
      id: "search_1",
      title: `${query} 관련 이벤트 1`,
      summary: `${query}에 대한 상세한 설명이 포함된 이벤트입니다.`,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: "전북대학교",
      tags: [query, "공모전"],
      org: { id: "org_1", name: "전북대학교", logoUrl: null },
      sourceUrl: "https://example.com",
    },
    {
      id: "search_2", 
      title: `${query} 관련 이벤트 2`,
      summary: `${query}와 관련된 또 다른 이벤트입니다.`,
      startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endAt: null,
      location: "온라인",
      tags: [query, "세미나"],
      org: { id: "org_2", name: "SW사업단", logoUrl: null },
      sourceUrl: "https://example.com",
    },
  ];

  const mockOrganizations: Org[] = [
    {
      id: "org_search_1",
      name: `${query} 관련 조직 1`,
      logoUrl: null,
      homepageUrl: "https://example.com",
    },
    {
      id: "org_search_2", 
      name: `${query} 관련 조직 2`,
      logoUrl: null,
      homepageUrl: "https://example.com",
    },
  ];

  return {
    events: mockEvents,
    organizations: mockOrganizations,
    nextCursor: null,
  };
}
