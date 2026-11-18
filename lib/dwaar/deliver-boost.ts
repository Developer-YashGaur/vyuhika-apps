import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { generateJson, type GenerateFn } from "@/lib/ai/generate-json";
import { analyzeMatch } from "@/lib/analyze/analyze";
import { BOOST_SYSTEM_INSTRUCTION, boostResultSchema, buildBoostPrompt, finalizeBoostResult, type FinalBoost } from "@/lib/dwaar/boost-writer";
import { RESUME_TEXT_LIMITS } from "@/lib/dwaar/request-form";
import { parseResumeDoc, resumeDocToText } from "@/lib/dwaar/resume-doc";
import { finalizeMatchResult, prepareUntrustedText } from "@/lib/dwaar/resume-safety";

// Delivers a PAID Boost: reads the job from the database, cleans the resume text the browser read, asks the AI,
// cleans the answer and saves it. A failed try never loses the payment: the order stays "paid" and can be retried
// (the database allows 3 tries). The AI function is passed in, so tests can use a fake one.

type Db = SupabaseClient<Database>;

export type DeliverOutcome =
  | { kind: "delivered"; requestId: string }
  | { kind: "bad-resume" } // too short, too long or empty
  | { kind: "flagged" } // the resume or job text looks like instructions to an AI; nothing was sent to the AI
  | { kind: "not-paid" } // no paid Boost waiting for this order
  | { kind: "limit" } // 3 tries used
  | { kind: "unavailable" }
  | { kind: "failed" };

type Deps = { supabase: Db; secret: string | null; generate: GenerateFn | null; model: string };

export async function deliverBoost({ supabase, secret, generate, model }: Deps, args: { orderId: string; resumeText: string }): Promise<DeliverOutcome> {
  if (!secret || !generate) return { kind: "unavailable" };

  const length = args.resumeText.trim().length;
  if (length < RESUME_TEXT_LIMITS.min || length > RESUME_TEXT_LIMITS.max) return { kind: "bad-resume" };

  const input = await supabase.rpc("dwaar_get_boost_input", { p_order_id: args.orderId });
  if (input.error) {
    if (input.error.code === "DW031") return { kind: "not-paid" };
    if (input.error.code === "DW032") return { kind: "limit" };
    console.error("[dwaar] reading boost input failed:", input.error.code);
    return { kind: "failed" };
  }
  const job = input.data?.[0];
  if (!job) return { kind: "not-paid" };

  const resume = prepareUntrustedText(args.resumeText);
  const description = prepareUntrustedText(job.out_job_description);
  if (resume.flagged || description.flagged) return { kind: "flagged" };

  const save = (status: "done" | "failed", result?: FinalBoost) =>
    supabase.rpc("dwaar_save_boost_result", {
      p_order_id: args.orderId,
      p_secret: secret,
      p_status: status,
      p_improved_resume: result?.improvedResume ?? "",
      p_summary: result?.summary ?? "",
      p_changes: result?.changes ?? [],
      p_profile_tips: result?.profileTips ?? [],
      p_linkedin_tips: result?.linkedinTips ?? [],
      p_model: model,
    });

  try {
    const raw = await generateJson({
      systemInstruction: BOOST_SYSTEM_INSTRUCTION,
      prompt: buildBoostPrompt({ resume: resume.text, jobTitle: job.out_job_title, company: job.out_company_name, jobDescription: description.text }),
      schema: boostResultSchema,
      generate,
      logLabel: "boost",
    });
    const written = finalizeBoostResult(raw, { resume: resume.text, jobDescription: description.text });
    const result = await withNewScore(written, generate, description.text);
    const saved = await save("done", result);
    if (saved.error || saved.data !== true) {
      console.error("[dwaar] saving the boost failed:", saved.error?.code);
      return { kind: "failed" };
    }
    return { kind: "delivered", requestId: job.out_request_id };
  } catch (error) {
    console.error("[dwaar] boost writing failed:", (error as Error)?.name); // the kind of failure only, never the text
    await save("failed");
    return { kind: "failed" };
  }
}

// Scores the improved resume for the same job, the same way the free check scores the original. This is part of the
// Boost (no daily limit, nothing recorded). If scoring fails, the Boost is still delivered, just without a new score.
async function withNewScore(written: FinalBoost, generate: GenerateFn, jobText: string): Promise<FinalBoost> {
  try {
    const doc = parseResumeDoc(written.improvedResume);
    if (!doc) return written;
    const text = prepareUntrustedText(resumeDocToText(doc, { name: doc.name, email: null, phone: null, linkedin: null, links: [] })).text;
    const raw = await analyzeMatch(text, jobText, generate);
    const scored = finalizeMatchResult(raw, false);
    return { ...written, improvedResume: JSON.stringify({ ...doc, matchScore: scored.score, stillMissing: scored.missingKeywords.slice(0, 8) }) };
  } catch (error) {
    console.error("[dwaar] scoring the improved resume failed:", (error as Error)?.name, (error as { code?: string })?.code);
    return written;
  }
}

export function deliverMessage(kind: Exclude<DeliverOutcome["kind"], "delivered">): string {
  switch (kind) {
    case "bad-resume":
      return "We could not read enough text from that resume. Please choose a text-based PDF or Word file.";
    case "flagged":
      return "That resume contains text that looks like instructions to an AI, so we did not use it. Please choose a clean copy.";
    case "not-paid":
      return "There is no paid Boost waiting on this request.";
    case "limit":
      return "We tried 3 times and it did not work. Your payment is safe: write to support@vyuhika.com and we will sort it out.";
    case "unavailable":
      return "Writing your Boost is not available right now. Your payment is safe. Please try again later.";
    default:
      return "We could not write your Boost this time. Your payment is safe. Please try again.";
  }
}
