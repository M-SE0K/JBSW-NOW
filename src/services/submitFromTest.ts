import { processCrawledText } from "./ingest";
import { Org } from "../types";

export type SubmitTextParams = {
  text: string;
  sourceUrl?: string | null;
  org?: Org;
};

export async function submitTextFromTestPage(params: SubmitTextParams) {
  const { eventId, analysis, tags } = await processCrawledText({
    text: params.text,
    sourceUrl: params.sourceUrl ?? null,
    org: params.org,
  });
  return { eventId, tags, analysis };
}


