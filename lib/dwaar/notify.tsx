import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import NewRequestEmail from "@/components/emails/NewRequestEmail";
import { NEW_REQUEST_SUBJECT, newRequestText } from "@/lib/dwaar/request-email-text";
import type { EmailSettings } from "@/lib/email/settings";
import type { SendEmailFn } from "@/lib/feedback/deliver";
import type { Database } from "@/types/database";

// Tells confirmed employees at the company that a candidate is waiting.
// The DATABASE decides who is emailed: it hands out at most 20 confirmed providers per request, never someone who
// already got 3 emails in 24 hours, and only once per request. Here we only send what it hands back.
// This never throws: a failed email must not undo the request.

type Db = SupabaseClient<Database>;
type Deps = { secret: string; send: SendEmailFn; settings: EmailSettings };

export async function notifyProviders(supabase: Db, deps: Deps, requestId: string): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.rpc("dwaar_claim_provider_notifications", { p_request_id: requestId, p_secret: deps.secret });
  if (error) {
    console.error("[dwaar] could not claim provider notifications", { code: error.code });
    return { sent: 0, failed: 0 };
  }

  const rows = data ?? [];
  const results = await Promise.allSettled(
    rows.map(async (row) => {
      const html = await render(<NewRequestEmail jobTitle={row.out_job_title} company={row.out_company_name} assetBaseUrl={deps.settings.assetBaseUrl} />);
      const text = newRequestText(row.out_job_title, row.out_company_name, deps.settings.assetBaseUrl);
      return deps.send({ from: deps.settings.from, to: row.out_work_email, subject: NEW_REQUEST_SUBJECT, html, text });
    }),
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  const failed = rows.length - sent;
  if (failed > 0) console.error("[dwaar] some provider emails were not sent", { failed });
  return { sent, failed };
}
