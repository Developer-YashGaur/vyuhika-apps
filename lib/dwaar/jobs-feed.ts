import { hasPublicHttpsShape } from "@/lib/dwaar/url-safety";
import { redactContacts, stripLinks } from "@/lib/dwaar/resume-safety";

// The "Latest jobs" feed: twice a day the server asks a job source for the 20 newest jobs and stores them.
// The jobs come from OUTSIDE, so every field is checked and cleaned before it is stored: plain text only, no links
// inside descriptions, no phone numbers or emails, and the job link must be a plain public https link.
// The source is swappable: Adzuna (needs a free key) or Remotive (no key, remote jobs). Both give the same FeedJob.

export type FeedJob = {
  source: "adzuna" | "remotive";
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedAt: string | null;
};

export const FEED_SIZE = 20;
const DESCRIPTION_MAX = 600;

type Env = Record<string, string | undefined>;
type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

// Plain text from a snippet that may contain HTML: tags and entities removed, spaces collapsed, no links or contacts.
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const noTags = raw
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'");
  const text = redactContacts(stripLinks(noTags)).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function asDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function build(source: FeedJob["source"], id: unknown, title: unknown, company: unknown, location: unknown, description: unknown, url: unknown, posted: unknown): FeedJob | null {
  const externalId = typeof id === "string" || typeof id === "number" ? String(id).trim() : "";
  const cleanTitle = cleanText(title, 160);
  const cleanCompany = cleanText(company, 120);
  if (!externalId || externalId.length > 120 || cleanTitle.length < 2 || cleanCompany.length < 1) return null;
  if (typeof url !== "string" || !hasPublicHttpsShape(url) || url.length > 500) return null;
  return {
    source,
    externalId,
    title: cleanTitle,
    company: cleanCompany,
    location: cleanText(location, 120),
    description: cleanText(description, DESCRIPTION_MAX),
    url,
    postedAt: asDate(posted),
  };
}

type AdzunaJob = { id?: unknown; title?: unknown; company?: { display_name?: unknown }; location?: { display_name?: unknown }; description?: unknown; redirect_url?: unknown; created?: unknown };
type RemotiveJob = { id?: unknown; title?: unknown; company_name?: unknown; candidate_required_location?: unknown; description?: unknown; url?: unknown; publication_date?: unknown };

export function normalizeAdzuna(payload: unknown): FeedJob[] {
  const results = (payload as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  return results
    .map((r: AdzunaJob) => build("adzuna", r?.id, r?.title, r?.company?.display_name, r?.location?.display_name, r?.description, r?.redirect_url, r?.created))
    .filter((j): j is FeedJob => j !== null);
}

export function normalizeRemotive(payload: unknown): FeedJob[] {
  const jobs = (payload as { jobs?: unknown })?.jobs;
  if (!Array.isArray(jobs)) return [];
  return jobs
    .map((r: RemotiveJob) => build("remotive", r?.id, r?.title, r?.company_name, r?.candidate_required_location || "Remote", r?.description, r?.url, r?.publication_date))
    .filter((j): j is FeedJob => j !== null);
}

// Remotive does not always keep to the category we ask for, so we also keep only tech-looking titles.
const TECH_WORDS = /\b(developer|engineer|devops|sre|programmer|software|backend|back-end|frontend|front-end|full[- ]?stack|data|analyst|machine learning|ml|ai|python|java|node|react|rails|golang|qa|tester|security|cloud|architect|tech lead|android|ios|mobile|platform|database|dba|scientist)\b/i;
export function isTechTitle(title: string): boolean {
  return TECH_WORDS.test(title);
}

// Same job twice (same source and id) is kept once; newest first; at most FEED_SIZE.
export function pickLatest(jobs: FeedJob[], size = FEED_SIZE): FeedJob[] {
  const seen = new Set<string>();
  const unique = jobs.filter((j) => {
    const key = `${j.source}:${j.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const time = (j: FeedJob) => (j.postedAt ? Date.parse(j.postedAt) : 0);
  return unique.sort((a, b) => time(b) - time(a)).slice(0, size);
}

export type ProviderName = "adzuna" | "remotive";

// Adzuna when both keys are set, otherwise Remotive (free, no key).
export function chooseProvider(env: Env): ProviderName {
  return env.ADZUNA_APP_ID?.trim() && env.ADZUNA_APP_KEY?.trim() ? "adzuna" : "remotive";
}

export async function fetchLatestJobs(env: Env, fetchFn: FetchFn = fetch): Promise<FeedJob[]> {
  const provider = chooseProvider(env);
  const signal = AbortSignal.timeout(15000);
  if (provider === "adzuna") {
    const country = (env.ADZUNA_COUNTRY?.trim() || "in").toLowerCase().replace(/[^a-z]/g, "").slice(0, 2) || "in";
    const query = new URLSearchParams({
      app_id: env.ADZUNA_APP_ID!.trim(),
      app_key: env.ADZUNA_APP_KEY!.trim(),
      results_per_page: String(FEED_SIZE),
      sort_by: "date",
      category: "it-jobs",
      "content-type": "application/json",
    });
    const res = await fetchFn(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${query}`, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Adzuna answered ${res.status}`);
    return pickLatest(normalizeAdzuna(await res.json()));
  }
  const res = await fetchFn(`https://remotive.com/api/remote-jobs?category=software-dev&limit=100`, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Remotive answered ${res.status}`);
  return pickLatest(normalizeRemotive(await res.json()).filter((j) => isTechTitle(j.title)));
}

// The text shown under the jobs, as the sources require.
export function feedCredit(source: FeedJob["source"]): { name: string; href: string } {
  return source === "adzuna" ? { name: "Adzuna", href: "https://www.adzuna.in" } : { name: "Remotive", href: "https://remotive.com" };
}
