import { z } from "zod";

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().url().nullable().optional().transform((v) => v ?? null),
  homepageUrl: z.string().url().nullable().optional(),
});

export const EventAISchema = z.object({
  summary: z.string().nullable().optional(),
  recommendation: z.string().nullable().optional(),
});

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  org: OrgSchema,
  sourceUrl: z.string().url().nullable().optional(),
  ai: EventAISchema.nullable().optional(),
});

export const PagedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    nextCursor: z.string().nullable().optional(),
  });

export type Org = z.infer<typeof OrgSchema>;
export type Event = z.infer<typeof EventSchema>;


