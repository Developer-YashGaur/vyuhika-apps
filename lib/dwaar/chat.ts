import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// The small chat after an employee accepts a request. The candidate sends ONE message, then the employee replies
// (up to 3 times). The database decides who may read or write; this code checks the text and words the answers.
// Contact details (emails and phone numbers) are not allowed: Dwaar keeps people's details private.

type Db = SupabaseClient<Database>;

export const MESSAGE_MAX = 600;

export type ChatInfo = Database["public"]["Functions"]["dwaar_chat_info"]["Returns"][number];
export type ChatMessage = Database["public"]["Functions"]["dwaar_chat_messages"]["Returns"][number];
export type SendStatus = "sent" | "not_allowed" | "not_yet" | "limit";

export const CHAT_MESSAGES = {
  empty: "Please write a message first.",
  tooLong: `Please keep it under ${MESSAGE_MAX} characters.`,
  contact: "Please do not type emails or phone numbers here. Use the phone and email buttons under the chat instead.",
  not_allowed: "You cannot write in this chat.",
  not_yet: "Please wait for the candidate to write first.",
  limit: "You have used all the messages you can send in this chat.",
  failed: "Something went wrong. Please try again in a moment.",
} as const;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /\+?\d[\d\s().-]{7,}\d/;

export type MessageCheck = { ok: true; text: string } | { ok: false; message: string };

export function checkMessage(raw: unknown): MessageCheck {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ok: false, message: CHAT_MESSAGES.empty };
  if (text.length > MESSAGE_MAX) return { ok: false, message: CHAT_MESSAGES.tooLong };
  if (EMAIL.test(text) || PHONE.test(text)) return { ok: false, message: CHAT_MESSAGES.contact };
  return { ok: true, text };
}

export type SendResult = { ok: true } | { ok: false; message: string };

export async function sendMessage(supabase: Db, requestId: string, raw: unknown): Promise<SendResult> {
  const checked = checkMessage(raw);
  if (!checked.ok) return checked;
  const { data, error } = await supabase.rpc("dwaar_send_message", { p_request_id: requestId, p_body: checked.text });
  if (error) return { ok: false, message: error.code === "DW040" ? CHAT_MESSAGES.tooLong : CHAT_MESSAGES.failed };
  if (data === "sent") return { ok: true };
  if (data === "not_allowed" || data === "not_yet" || data === "limit") return { ok: false, message: CHAT_MESSAGES[data] };
  return { ok: false, message: CHAT_MESSAGES.failed };
}

// null when the person has no access to this chat (the database returns nothing).
export async function getChat(supabase: Db, requestId: string): Promise<{ info: ChatInfo; messages: ChatMessage[] } | null> {
  const [info, messages] = await Promise.all([
    supabase.rpc("dwaar_chat_info", { p_request_id: requestId }),
    supabase.rpc("dwaar_chat_messages", { p_request_id: requestId }),
  ]);
  if (info.error || messages.error) throw new Error("Could not load the chat.");
  const first = info.data?.[0];
  return first ? { info: first, messages: messages.data ?? [] } : null;
}
