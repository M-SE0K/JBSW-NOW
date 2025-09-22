import { api } from "./client";
import { Event } from "../types";
import { EventSchema, PagedResponseSchema } from "../utils/schema";

export type EventsQuery = {
  q?: string;
  orgId?: string;
  tags?: string[];
  startDate?: string; // ISO
  endDate?: string; // ISO
  cursor?: string;
};

export async function fetchEvents(params: EventsQuery = {}) {
  const res = await api.get("/events", { params: { ...params, tags: params.tags?.join(",") } });
  const parsed = PagedResponseSchema(EventSchema).safeParse(res.data);
  if (!parsed.success) {
    // TODO: remove placeholder fallback when backend ready
    return { data: mockEvents, nextCursor: null } as { data: Event[]; nextCursor: string | null };
  }
  return parsed.data as { data: Event[]; nextCursor: string | null | undefined };
}

export async function fetchEventById(id: string) {
  const res = await api.get(`/events/${id}`);
  const parsed = EventSchema.safeParse(res.data);
  if (!parsed.success) {
    const found = mockEvents.find((e) => e.id === id);
    if (!found) throw new Error("이벤트를 찾을 수 없습니다.");
    return found;
  }
  return parsed.data as Event;
}

// Placeholder data
const mockEvents: Event[] = [
  {
    id: "evt_mock_1",
    title: "SW 경진대회",
    summary: "전북권 학생 대상 SW 경진대회 요약",
    startAt: new Date().toISOString(),
    endAt: null,
    location: "전북대학교",
    tags: ["공모전", "학생"],
    org: { id: "org_jbnu", name: "전북대학교 SW사업단", logoUrl: null },
    sourceUrl: "https://example.com",
    ai: { summary: "요약", recommendation: "참여 추천" },
  },
];


