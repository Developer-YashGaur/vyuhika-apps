import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Contact requests in the chat. After accepting, the employee can ASK for the candidate's phone number or email.
// The candidate chooses Share or Decline. The database holds the rules (who may ask, who may answer, who sees the
// value); this code wraps the calls and words the answers.

type Db = SupabaseClient<Database>;

export type ContactKind = "phone" | "email";
export type ContactStatus = "pending" | "shared" | "declined";
export type ContactItem = { kind: ContactKind; status: ContactStatus; value: string | null };

export const CONTACT_KINDS: ContactKind[] = ["phone", "email"];
export const KIND_LABEL: Record<ContactKind, string> = { phone: "phone number", email: "email" };

export function isContactKind(value: unknown): value is ContactKind {
  return value === "phone" || value === "email";
}

export type ContactResult = { ok: boolean; message: string };

const FAILED: ContactResult = { ok: false, message: "Something went wrong. Please try again in a moment." };

export async function getContactState(supabase: Db, requestId: string): Promise<ContactItem[]> {
  const { data, error } = await supabase.rpc("dwaar_contact_state", { p_request_id: requestId });
  if (error) throw new Error("Could not load contact requests.");
  return (data ?? []).flatMap((r) =>
    isContactKind(r.out_kind) && (r.out_status === "pending" || r.out_status === "shared" || r.out_status === "declined")
      ? [{ kind: r.out_kind, status: r.out_status, value: r.out_value ?? null }]
      : [],
  );
}

export async function askContact(supabase: Db, requestId: string, kind: unknown, otherName: string): Promise<ContactResult> {
  if (!isContactKind(kind)) return FAILED;
  const { data, error } = await supabase.rpc("dwaar_ask_contact", { p_request_id: requestId, p_kind: kind });
  if (error) return FAILED;
  switch (data) {
    case "asked":
      return { ok: true, message: `Your question was sent. ${otherName} can share their ${KIND_LABEL[kind]} or decline.` };
    case "pending":
      return { ok: true, message: `You already asked. Waiting for ${otherName} to answer.` };
    case "shared":
      return { ok: true, message: `${otherName} already shared their ${KIND_LABEL[kind]}.` };
    case "declined":
      return { ok: false, message: `${otherName} chose not to share their ${KIND_LABEL[kind]}. It cannot be asked again.` };
    case "not_allowed":
      return { ok: false, message: "You cannot ask in this chat." };
    default:
      return FAILED;
  }
}

export async function answerContact(supabase: Db, requestId: string, kind: unknown, share: boolean): Promise<ContactResult> {
  if (!isContactKind(kind)) return FAILED;
  const { data, error } = await supabase.rpc("dwaar_answer_contact", { p_request_id: requestId, p_kind: kind, p_share: share });
  if (error) return FAILED;
  switch (data) {
    case "shared":
      return { ok: true, message: `You shared your ${KIND_LABEL[kind]}.` };
    case "declined":
      return { ok: true, message: `You declined. Your ${KIND_LABEL[kind]} was not shared.` };
    case "no_phone":
      return { ok: false, message: "You have no phone number saved. Add it in your profile, then try again." };
    case "not_pending":
      return { ok: false, message: "This question was already answered." };
    default:
      return FAILED;
  }
}
