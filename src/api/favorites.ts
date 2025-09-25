import { Event, Org } from "../types";

export type FavoriteItem = {
  id: string;
  type: "event" | "organization";
  itemId: string;
  title: string;
  createdAt: string;
  // 실제 아이템 데이터 (선택적)
  event?: Event;
  organization?: Org;
};

export type FavoritesQuery = {
  type?: "all" | "events" | "organizations";
  cursor?: string;
};

export async function getFavorites(params: FavoritesQuery = {}): Promise<{ data: FavoriteItem[]; nextCursor?: string | null }> {
  try {
    // TODO: 실제 API 호출
    // const res = await api.get("/favorites", { params });
    // return res.data;
    
    // 모의 데이터 반환
    return getMockFavorites();
  } catch (error) {
    console.error("즐겨찾기 조회 실패:", error);
    return { data: [], nextCursor: null };
  }
}

export async function addFavorite(type: "event" | "organization", itemId: string, title: string): Promise<void> {
  try {
    // TODO: 실제 API 호출
    // await api.post("/favorites", { type, itemId, title });
    
    // 로컬 스토리지에 저장 (임시)
    const favorites = await getFavorites();
    const newFavorite: FavoriteItem = {
      id: `fav_${Date.now()}`,
      type,
      itemId,
      title,
      createdAt: new Date().toISOString(),
    };
    
    const updated = [newFavorite, ...favorites.data];
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("favorites", JSON.stringify(updated));
    }
  } catch (error) {
    console.error("즐겨찾기 추가 실패:", error);
  }
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  try {
    // TODO: 실제 API 호출
    // await api.delete(`/favorites/${favoriteId}`);
    
    // 로컬 스토리지에서 제거 (임시)
    const favorites = await getFavorites();
    const updated = favorites.data.filter(fav => fav.id !== favoriteId);
    
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("favorites", JSON.stringify(updated));
    }
  } catch (error) {
    console.error("즐겨찾기 제거 실패:", error);
  }
}

export async function isFavorite(type: "event" | "organization", itemId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.data.some(fav => fav.type === type && fav.itemId === itemId);
  } catch (error) {
    console.error("즐겨찾기 확인 실패:", error);
    return false;
  }
}

// 모의 즐겨찾기 데이터
function getMockFavorites(): { data: FavoriteItem[]; nextCursor: string | null } {
  const mockFavorites: FavoriteItem[] = [
    {
      id: "fav_1",
      type: "event",
      itemId: "evt_1",
      title: "SW 경진대회",
      createdAt: "2024-09-20T10:00:00Z",
    },
    {
      id: "fav_2", 
      type: "organization",
      itemId: "org_1",
      title: "전북대학교 SW사업단",
      createdAt: "2024-09-19T15:30:00Z",
    },
  ];

  return {
    data: mockFavorites,
    nextCursor: null,
  };
}