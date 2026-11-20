import { createClient as createPlainClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { fetchLatestJobs, type FeedJob } from "@/lib/dwaar/jobs-feed";
import { supabaseEnv } from "@/lib/supabase/env";

type Db = SupabaseClient<Database>;

export type JobView = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: "adzuna" | "remotive";
  postedAt: string | null;
};

// The jobs shown on the site. The search text is matched as plain text by the database (never as a pattern).
export async function listLatestJobs(supabase: Db, query: string | null, limit = 20): Promise<JobView[]> {
  const q = query?.trim().slice(0, 80) || undefined;
  const { data, error } = await supabase.rpc("dwaar_latest_jobs", { p_query: q, p_limit: limit });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.out_id,
    title: r.out_title,
    company: r.out_company,
    location: r.out_location,
    description: r.out_description,
    url: r.out_url,
    source: r.out_source === "adzuna" ? "adzuna" : "remotive",
    postedAt: r.out_posted_at,
  }));
}

export function toRpcJobs(jobs: FeedJob[]) {
  return jobs.map((j) => ({
    source: j.source,
    external_id: j.externalId,
    title: j.title,
    company: j.company,
    location: j.location,
    description: j.description,
    url: j.url,
    posted_at: j.postedAt,
  }));
}

export type RefreshOutcome = { ok: true; fetched: number; stored: number } | { ok: false; reason: "not_set_up" | "source_failed" | "store_failed" };

// One refresh: ask the source for the newest jobs, then store them with the server secret.
// No signed-in person is involved, so this uses the public key plus the server secret that the database checks.
export async function refreshJobsFeed(env: Record<string, string | undefined> = process.env, fetchFn?: typeof fetch): Promise<RefreshOutcome> {
  const secret = env.DWAAR_SERVER_SECRET?.trim();
  if (!secret || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { ok: false, reason: "not_set_up" };

  let jobs: FeedJob[];
  try {
    jobs = await fetchLatestJobs(env, fetchFn);
  } catch {
    return { ok: false, reason: "source_failed" };
  }
  if (jobs.length === 0) return { ok: false, reason: "source_failed" };

  const { url, anonKey } = supabaseEnv();
  const supabase = createPlainClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("dwaar_upsert_jobs", { p_secret: secret, p_jobs: toRpcJobs(jobs) });
  if (error) return { ok: false, reason: "store_failed" };
  return { ok: true, fetched: jobs.length, stored: data ?? 0 };
}

// Finds the Dwaar company that a job's company name refers to, so "Ask for a referral" can pick it. Only a clear match counts:
// the names must be equal after removing capitals, spaces, punctuation and endings like "Inc" or "Pvt Ltd". No guessing.
const ENDINGS = /\b(inc|llc|ltd|limited|pvt|private|corp|corporation|co|gmbh|plc)\b\.?/g;
const plain = (name: string) => name.toLowerCase().replace(ENDINGS, " ").replace(/[^a-z0-9]+/g, "");

export function matchCompanyId(jobCompany: string, companies: { id: string; name: string }[]): string {
  const wanted = plain(jobCompany);
  if (wanted.length < 2) return "";
  const hits = companies.filter((c) => plain(c.name) === wanted);
  return hits.length === 1 ? hits[0]!.id : "";
}
