import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import StatusEmail from "@/components/emails/StatusEmail";
import { statusEmailContent, type StatusKind } from "@/lib/dwaar/status-email-text";
import type { EmailSettings } from "@/lib/email/settings";
import type { SendEmailFn } from "@/lib/feedback/deliver";
import type { Database } from "@/types/database";

// Sends the email for the one status change that needs it: a request was accepted. Chat messages send no email.
// The DATABASE keeps the list of what happened and who is told (never message text); here we only send what it hands
// back for the signed-in person's own requests. This never throws: a failed email must not undo the action.

type Db = SupabaseClient<Database>;
type Deps = { secret: string; send: SendEmailFn; settings: EmailSettings };

// Only "accepted" is emailed. Chat messages and contact requests are live in the chat, so they send no email.
const KINDS: StatusKind[] = ["accepted"];

// "Your request was sent": a confirmation to the candidate right after they ask. It says only the job and company.
export async function sendRequestSentEmail(
  deps: Pick<Deps, "send" | "settings">,
  info: { to: string | null | undefined; name: string; company: string; jobTitle: string; requestId: string },
): Promise<boolean> {
  if (!info.to) return false;
  try {
    const content = statusEmailContent(
      { kind: "sent", requestId: info.requestId, toName: info.name, otherName: "", company: info.company, jobTitle: info.jobTitle },
      deps.settings.assetBaseUrl,
    );
    const html = await render(<StatusEmail content={content} assetBaseUrl={deps.settings.assetBaseUrl} />);
    return await deps.send({ from: deps.settings.from, to: info.to, subject: content.subject, html, text: content.text });
  } catch (error) {
    console.error("[dwaar] the request-sent email failed:", (error as Error)?.name);
    return false;
  }
}

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
