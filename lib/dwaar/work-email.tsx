import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import WorkEmailCodeEmail from "@/components/emails/WorkEmailCodeEmail";
import { WORK_EMAIL_CODE_SUBJECT, workEmailCodeText } from "@/lib/dwaar/work-email-text";
import type { EmailSettings } from "@/lib/email/settings";
import type { SendEmailFn } from "@/lib/feedback/deliver";
import type { Database } from "@/types/database";

// Confirming a referral provider's work email with a 6-digit code.
// The database makes and checks the code. This server code only passes it along: it asks the database for
// a code (using a secret that only the server knows), emails it to the address the DATABASE says is on the
// profile, and later passes on the code the person typed.

type Db = SupabaseClient<Database>;

export type Outcome = { ok: true } | { ok: false; message: string };

const GENERIC = "Something went wrong. Please try again in a moment.";

// Turns a database error code into a sentence a person can act on.
export function friendlyCodeError(code: string | undefined): string {
  switch (code) {
    case "DW001":
      return "A code was just sent. Please wait a minute before asking for another.";
    case "DW002":
      return "You have asked for too many codes. Please try again in an hour.";
    case "DW003":
      return "This work email is already confirmed.";
    case "DW004":
      return "Add a work email to your profile first.";
    default:
      return GENERIC;
  }
}

export const CODE_PATTERN = /^[0-9]{6}$/;

// Spaces inside the code are fine ("123 456"), because some people type it that way.
export function cleanCode(input: string): string {
  return input.replace(/\s+/g, "");
}

// The server secret is read from an environment variable that is NOT public (no NEXT_PUBLIC_ prefix).
export function serverSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = env.DWAAR_SERVER_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function workEmailConfirmationConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(serverSecret(env) && env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim() && env.EMAIL_ASSET_BASE_URL?.trim());
}

export async function buildWorkEmailCodeEmail(code: string, assetBaseUrl: string) {
  return {
    subject: WORK_EMAIL_CODE_SUBJECT,
    html: await render(<WorkEmailCodeEmail code={code} assetBaseUrl={assetBaseUrl} />),
    text: workEmailCodeText(code, assetBaseUrl),
  };
}

type RequestDeps = { secret: string; send: SendEmailFn; settings: EmailSettings };

// Asks the database for a code and emails it. The address comes from the database (the person's saved work
// email), never from the browser, so this cannot be used to send codes to other people's addresses.
export async function requestWorkEmailCode(supabase: Db, deps: RequestDeps): Promise<Outcome> {
  const { data, error } = await supabase.rpc("dwaar_issue_work_email_code", { p_secret: deps.secret });
  if (error) return { ok: false, message: friendlyCodeError(error.code) };

  const row = data?.[0];
  if (!row) return { ok: false, message: GENERIC };

  const email = await buildWorkEmailCodeEmail(row.out_code, deps.settings.assetBaseUrl);
  const sent = await deps.send({ from: deps.settings.from, to: row.out_work_email, ...email });
  return sent ? { ok: true } : { ok: false, message: "We could not send the email. Please try again in a moment." };
}

export async function confirmWorkEmailCode(supabase: Db, rawCode: string): Promise<Outcome> {
  const code = cleanCode(rawCode);
  if (!CODE_PATTERN.test(code)) return { ok: false, message: "The code has 6 digits. Please check it and try again." };

  const { data, error } = await supabase.rpc("dwaar_confirm_work_email", { p_code: code });
  if (error) return { ok: false, message: GENERIC };
  return data === true
    ? { ok: true }
    : { ok: false, message: "That code is not right, or it has expired. Check it, or ask for a new code." };
}
