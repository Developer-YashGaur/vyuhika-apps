import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Referral requests: thin wrappers around the database functions. The database enforces every rule
// (limits, who can see what); this code only turns its error codes into friendly sentences.

type Db = SupabaseClient<Database>;

export type MyRequest = Database["public"]["Functions"]["dwaar_my_requests"]["Returns"][number];
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; message: string };

const GENERIC = "Something went wrong. Please try again in a moment.";

export function friendlyRequestError(code: string | undefined): string {
  switch (code) {
    case "DW010":
      return "You already have 5 open requests. Cancel one, or wait for an answer, before you send another.";
    case "DW011":
      return "You already asked for a referral for this job at this company.";
    case "DW012":
      return "Turn on \"I am looking for referrals\" in your profile first.";
    case "DW013":
      return "That company is not available right now. Please choose another.";
    case "DW015":
      return "You have used today's 5 resume checks. Please try again tomorrow.";
    case "DW014":
      return "Please check the job title and link, then try again.";
    case "42501":
      return "You are not allowed to do that. Please sign in again.";
    default:
      return GENERIC;
  }
}

export type NewRequest = {
  companyId: string;
  jobTitle: string;
  jobUrl: string;
  note: string | null;
  jobId: string | null;
  jobDescription: string;
  resumePath: string;
  consent: boolean;
};

export async function createRequest(supabase: Db, input: NewRequest): Promise<ActionResult<string>> {
  const { data, error } = await supabase.rpc("dwaar_create_request", {
    p_company_id: input.companyId,
    p_job_title: input.jobTitle,
    p_job_url: input.jobUrl,
    p_note: input.note ?? undefined,
    p_job_id: input.jobId ?? undefined,
    p_job_description: input.jobDescription,
    p_resume_path: input.resumePath,
    p_resume_consent: input.consent,
  });
  if (error || !data) {
    if (error?.code) console.error("[dwaar] create request failed:", error.code);
    return { ok: false, message: friendlyRequestError(error?.code) };
  }
  return { ok: true, data };
}

export async function cancelRequest(supabase: Db, requestId: string): Promise<ActionResult<boolean>> {
  const { data, error } = await supabase.rpc("dwaar_cancel_request", { p_request_id: requestId });
  if (error) return { ok: false, message: friendlyRequestError(error.code) };
  return { ok: true, data: Boolean(data) };
}

export async function listMyRequests(supabase: Db): Promise<MyRequest[]> {
  const { data, error } = await supabase.rpc("dwaar_my_requests");
  if (error) throw new Error("Could not load your requests.");
  return data ?? [];
}

// ---- resume match results (the candidate's own; employees never see them) ----

export type Analysis = {
  requestId: string;
  status: "done" | "failed";
  score: number | null;
  summary: string;
  strengths: string[];
  gaps: string[];
};

// The database stores lists as JSON. Keep only the strings, so the page can never be handed anything else.
export function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function listMyAnalyses(supabase: Db): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from("dwaar_resume_analyses")
    .select("request_id, status, score, summary, strengths, gaps");
  if (error) throw new Error("Could not load your resume results.");
  return (data ?? []).map((row) => ({
    requestId: row.request_id,
    status: row.status === "done" ? "done" : "failed",
    score: row.score,
    summary: row.summary ?? "",
    strengths: toStringList(row.strengths),
    gaps: toStringList(row.gaps),
  }));
}
