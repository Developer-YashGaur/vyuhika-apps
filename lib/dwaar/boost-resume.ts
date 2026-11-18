import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { GenerateFn } from "@/lib/ai/generate-json";
import { analyzeMatch } from "@/lib/analyze/analyze";
import { parseLegacyResume } from "@/lib/dwaar/legacy-resume";
import { getMyProfile } from "@/lib/dwaar/profile";
import { parseResumeDoc, resumeDocToText, type ResumeContact, type SavedResume } from "@/lib/dwaar/resume-doc";
import { finalizeMatchResult, prepareUntrustedText } from "@/lib/dwaar/resume-safety";

type Db = SupabaseClient<Database>;

export type BoostResume = {
  raw: string;
  doc: SavedResume | null; // null only when the text has no resume sections at all
  contact: ResumeContact;
  jobTitle: string;
  jobDescription: string | null;
  summary: string | null;
  changes: unknown;
  profileTips: unknown;
  linkedinTips: unknown;
};

// Reads my delivered Boost for a request (row-level security means only my own is ever returned), the resume as a
// resume layout (old plain-text Boosts are read as well as possible), and my contact details from my profile.
export async function loadBoostResume(supabase: Db, user: { id: string; email?: string | null }, requestId: string): Promise<BoostResume | null> {
  const { data: result } = await supabase
    .from("dwaar_boost_results")
    .select("improved_resume, summary, changes, profile_tips, linkedin_tips")
    .eq("request_id", requestId)
    .eq("status", "done")
    .maybeSingle();
  if (!result?.improved_resume) return null;

  const [profile, request] = await Promise.all([
    getMyProfile(supabase, user.id),
    supabase.from("dwaar_referral_requests").select("job_title, job_description").eq("id", requestId).maybeSingle(),
  ]);
  return {
    raw: result.improved_resume,
    doc: parseResumeDoc(result.improved_resume) ?? parseLegacyResume(result.improved_resume),
    contact: {
      name: profile?.display_name ?? "",
      email: user.email ?? null,
      phone: profile?.phone ?? null,
      linkedin: profile?.linkedin_url ?? null,
      links: profile?.other_links ?? [],
    },
    jobTitle: request.data?.job_title ?? "",
    jobDescription: request.data?.job_description ?? null,
    summary: result.summary,
    changes: result.changes,
    profileTips: result.profile_tips,
    linkedinTips: result.linkedin_tips,
  };
}

// Scores a resume for the job, the same way the free check does. Returns null if it cannot be scored.
export async function scoreResume(boost: BoostResume, generate: GenerateFn | null): Promise<number | null> {
  if (!generate || !boost.doc || !boost.jobDescription) return null;
  try {
    const text = prepareUntrustedText(resumeDocToText(boost.doc, { ...boost.contact, email: null, phone: null, linkedin: null, links: [] }));
    const job = prepareUntrustedText(boost.jobDescription);
    if (text.flagged || job.flagged) return null;
    const raw = await analyzeMatch(text.text, job.text, generate);
    return finalizeMatchResult(raw, false).score;
  } catch (error) {
    console.error("[dwaar] scoring the boost failed:", (error as Error)?.name);
    return null;
  }
}
