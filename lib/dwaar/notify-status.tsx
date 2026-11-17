import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import StatusEmail from "@/components/emails/StatusEmail";
import { statusEmailContent, type StatusKind } from "@/lib/dwaar/status-email-text";
import type { EmailSettings } from "@/lib/email/settings";
import type { SendEmailFn } from "@/lib/feedback/deliver";
import type { Database } from "@/types/database";

// Sends the emails for status changes: a request was accepted, a chat message arrived, a reply arrived.
// The DATABASE keeps the list of what happened and who is told (never message text); here we only send what it hands
// back for the signed-in person's own requests. This never throws: a failed email must not undo the action.

type Db = SupabaseClient<Database>;
type Deps = { secret: string; send: SendEmailFn; settings: EmailSettings };

const KINDS: StatusKind[] = ["accepted", "message", "reply", "contact_asked", "contact_answered"];

export async function sendStatusEmails(supabase: Db, deps: Deps): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.rpc("dwaar_claim_email_events", { p_secret: deps.secret });
  if (error) {
    console.error("[dwaar] could not claim status emails", { code: error.code });
    return { sent: 0, failed: 0 };
  }

  const rows = (data ?? []).filter((r) => KINDS.includes(r.out_kind as StatusKind));
  const results = await Promise.allSettled(
    rows.map(async (row) => {
      const content = statusEmailContent(
        { kind: row.out_kind as StatusKind, requestId: row.out_request_id, toName: row.out_to_name, otherName: row.out_other_name, company: row.out_company_name, jobTitle: row.out_job_title },
        deps.settings.assetBaseUrl,
      );
      const html = await render(<StatusEmail content={content} assetBaseUrl={deps.settings.assetBaseUrl} />);
      return deps.send({ from: deps.settings.from, to: row.out_to_email, subject: content.subject, html, text: content.text });
    }),
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  const failed = rows.length - sent;
  if (failed > 0) console.error("[dwaar] some status emails were not sent", { failed });
  return { sent, failed };
}
