import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import NewRequestEmail from "@/components/emails/NewRequestEmail";
import { NEW_REQUEST_SUBJECT, newRequestText } from "@/lib/dwaar/request-email-text";
import type { EmailSettings } from "@/lib/email/settings";
import type { SendEmailFn } from "@/lib/feedback/deliver";
import type { Database } from "@/types/database";

// Tells confirmed employees at the company that a candidate is waiting.
// The DATABASE decides who is emailed: requests go out in waves of 5 opted-in, confirmed employees (best role match
// first), never someone over their weekly limit or already emailed 3 times in 24 hours. The first wave is sent when the
// request is created; the next wave is sent 24 hours later if nobody accepted. Here we only send what it hands back.
// This never throws: a failed email must not undo the request.

type Db = SupabaseClient<Database>;
type Deps = { secret: string; send: SendEmailFn; settings: EmailSettings };

export type Wave = "first" | "next";

export async function notifyProviders(supabase: Db, deps: Deps, requestId: string, wave: Wave = "first"): Promise<{ sent: number; failed: number }> {
  const name = wave === "first" ? "dwaar_claim_provider_notifications" : "dwaar_offer_next_wave";
  const { data, error } = await supabase.rpc(name, { p_request_id: requestId, p_secret: deps.secret });
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
