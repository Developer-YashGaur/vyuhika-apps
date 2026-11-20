import { render } from "@react-email/components";
import { createClient as createPlainClient, type SupabaseClient } from "@supabase/supabase-js";
import JobAlertEmail from "@/components/emails/JobAlertEmail";
import { JOB_ALERT_SUBJECT, jobAlertText, parseAlertJobs } from "@/lib/dwaar/job-alert-text";
import { getEmailSettings } from "@/lib/email/settings";
import { createResendSender } from "@/lib/feedback/deliver";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

// Plus job alerts. People save one set of words; after each jobs update the server emails the ones with new matches.
// The DATABASE decides who gets an email (Plus still active, new matching jobs, not sent in the last 11 hours).

type Db = SupabaseClient<Database>;

export type MyAlert = { keywords: string; active: boolean } | null;

export async function getMyAlert(supabase: Db): Promise<MyAlert> {
  const { data, error } = await supabase.rpc("dwaar_my_job_alert");
  const row = Array.isArray(data) ? data[0] : undefined;
  if (error || !row) return null;
  return { keywords: row.out_keywords, active: row.out_is_active };
}

export const ALERT_MESSAGES = {
  saved: "Job alert saved. We will email you when new jobs match.",
  off: "Job alert turned off.",
  "no-plus": "Job alerts are part of Dwaar Plus.",
  words: "Please type 2 to 80 characters, for example: python developer pune.",
  failed: "We could not save that right now. Please try again.",
} as const;

export type AlertSaveResult = keyof typeof ALERT_MESSAGES;

export async function saveMyAlert(supabase: Db, keywords: string, active: boolean): Promise<AlertSaveResult> {
  const { error } = await supabase.rpc("dwaar_set_job_alert", { p_keywords: keywords, p_active: active });
  if (!error) return active ? "saved" : "off";
  if (error.code === "DW040") return "no-plus";
  if (error.code === "DW043") return "words";
  console.error("[dwaar] could not save the job alert", { code: error.code });
  return "failed";
}

export type SendOutcome = { sent: number; failed: number; skipped?: string };

// Called by the twice-daily refresh. Never throws: a failed email must not break the refresh.
export async function sendJobAlerts(env: Record<string, string | undefined> = process.env): Promise<SendOutcome> {
  try {
    const secret = env.DWAAR_SERVER_SECRET?.trim();
    const settings = getEmailSettings(env);
    const send = createResendSender();
    if (!secret || !settings || !send || !env.NEXT_PUBLIC_SUPABASE_URL) return { sent: 0, failed: 0, skipped: "email is not set up" };

    const { url, anonKey } = supabaseEnv();
    const supabase = createPlainClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc("dwaar_claim_job_alerts", { p_secret: secret, p_limit: 100 });
    if (error) {
      console.error("[dwaar] could not claim job alerts", { code: error.code });
      return { sent: 0, failed: 0, skipped: "could not read alerts" };
    }
    const rows = data ?? [];
    const results = await Promise.allSettled(
      rows.map(async (row) => {
        const jobs = parseAlertJobs(row.out_jobs);
        if (jobs.length === 0) return false;
        const html = await render(<JobAlertEmail keywords={row.out_keywords} jobs={jobs} assetBaseUrl={settings.assetBaseUrl} />);
        return send({ from: settings.from, to: row.out_email, subject: JOB_ALERT_SUBJECT, html, text: jobAlertText(row.out_keywords, jobs, settings.assetBaseUrl) });
      }),
    );
    const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
    return { sent, failed: rows.length - sent };
  } catch (error) {
    console.error("[dwaar] job alerts failed:", (error as Error)?.name);
    return { sent: 0, failed: 0, skipped: "error" };
  }
}
