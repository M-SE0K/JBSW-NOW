import { api } from "./client";
import { Org } from "../types";
import { OrgSchema } from "../utils/schema";

export async function fetchOrgs(): Promise<Org[]> {
  const res = await api.get("/orgs");
  const arr = Array.isArray(res.data) ? res.data : [];
  const parsed = arr.map((o) => OrgSchema.safeParse(o)).filter((r) => r.success) as any[];
  if (!parsed.length) return mockOrgs;
  return parsed.map((p: any) => p.data) as Org[];
}

// Placeholder data
const mockOrgs: Org[] = [
  { id: "org_jbnu", name: "전북대학교 SW사업단", logoUrl: null, homepageUrl: "https://example.com" },
  { id: "org_ks", name: "군산대학교 SW사업단", logoUrl: null, homepageUrl: "https://example.com" },
];


