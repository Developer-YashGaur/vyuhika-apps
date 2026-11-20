import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// The employee side: requests waiting at their company, accepting or dismissing them, and the people they accepted.
// The database decides who may see and answer what; this code only wraps the calls and words the errors.

type Db = SupabaseClient<Database>;

export type InboxItem = Database["public"]["Functions"]["dwaar_open_requests_for_provider"]["Returns"][number];
export type AcceptedItem = Database["public"]["Functions"]["dwaar_my_accepted_requests"]["Returns"][number];
export type Answer = "accepted" | "dismissed" | "unavailable";
export type RespondResult = { ok: true; answer: Answer } | { ok: false; message: string };

export function friendlyRespondError(code: string | undefined): string {
  if (code === "DW020") return "Confirm your work email first. Only confirmed employees can answer requests.";
  if (code === "42501") return "You are not allowed to do that. Please sign in again.";
  return "Something went wrong. Please try again in a moment.";
}

export async function respondToRequest(supabase: Db, requestId: string, accept: boolean): Promise<RespondResult> {
  const { data, error } = await supabase.rpc("dwaar_respond_to_request", { p_request_id: requestId, p_accept: accept });
  if (error) return { ok: false, message: friendlyRespondError(error.code) };
  if (data === "accepted" || data === "dismissed" || data === "unavailable") return { ok: true, answer: data };
  return { ok: false, message: friendlyRespondError(undefined) };
}

export async function listInbox(supabase: Db): Promise<InboxItem[]> {
  const { data, error } = await supabase.rpc("dwaar_open_requests_for_provider");
  if (error) throw new Error("Could not load the inbox.");
  return data ?? [];
}

export async function listAccepted(supabase: Db): Promise<AcceptedItem[]> {
  const { data, error } = await supabase.rpc("dwaar_my_accepted_requests");
  if (error) throw new Error("Could not load accepted requests.");
  return data ?? [];
}

// What the inbox page says after an answer.
export const ANSWER_NOTES: Record<Answer, string> = {
  accepted: "You accepted the request. You can now chat live with the candidate and see their resume. Find them under \"People you accepted\".",
  dismissed: "Removed from your list. Other employees at your company still see it.",
  unavailable: "That request is no longer open. Someone else may have taken it, or the candidate cancelled it.",
};
