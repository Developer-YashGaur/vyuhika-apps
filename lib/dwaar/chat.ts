import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// The live chat after an employee accepts a request. Either person can write at any time, as often as they like (the
// database keeps a safety limit). The database decides who may read or write; this code checks the text and words the answers.
// Contact details (emails and phone numbers) are not allowed: Dwaar keeps people's details private.

type Db = SupabaseClient<Database>;

export const MESSAGE_MAX = 600;

export type ChatInfo = Database["public"]["Functions"]["dwaar_chat_info"]["Returns"][number];
export type ChatMessage = Database["public"]["Functions"]["dwaar_chat_messages"]["Returns"][number];
export type SendStatus = "sent" | "not_allowed" | "not_yet" | "limit" | "closed";

export const CHAT_MESSAGES = {
  empty: "Please write a message first.",
  tooLong: `Please keep it under ${MESSAGE_MAX} characters.`,
  contact: "Please do not type emails or phone numbers here. Use the phone and email buttons under the chat instead.",
  not_allowed: "You cannot write in this chat.",
  not_yet: "Please wait for the candidate to write first.",
  closed: "This chat was closed, so no new messages can be sent.",
  limit: "You are sending messages very fast, or this chat is full. Please wait a minute and try again.",
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
  if (data === "not_allowed" || data === "not_yet" || data === "limit" || data === "closed") return { ok: false, message: CHAT_MESSAGES[data] };
  return { ok: false, message: CHAT_MESSAGES.failed };
}

// null when the person has no access to this chat (the database returns nothing).
export async function getChat(supabase: Db, requestId: string): Promise<{ info: ChatInfo; messages: ChatMessage[]; closed: boolean } | null> {
  const [info, messages, closedIds] = await Promise.all([
    supabase.rpc("dwaar_chat_info", { p_request_id: requestId }),
    supabase.rpc("dwaar_chat_messages", { p_request_id: requestId }),
    supabase.rpc("dwaar_closed_chats"),
  ]);
  if (info.error || messages.error) throw new Error("Could not load the chat.");
  const first = info.data?.[0];
  if (!first) return null;
  const closed = (closedIds.data ?? []).includes(requestId);
  // A closed chat can be read but not written in.
  return { info: closed ? { ...first, out_can_send: false } : first, messages: messages.data ?? [], closed };
}

// The employee who accepted a request closes the chat. Only they can; the database checks.
export async function closeChat(supabase: Db, requestId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("dwaar_close_chat", { p_request_id: requestId });
  if (error) console.error("[dwaar] could not close the chat", { code: error.code });
  return !error && data === true;
}

// The request ids of my chats that are closed (as the candidate or as the employee).
export async function listClosedChatIds(supabase: Db): Promise<Set<string>> {
  const { data } = await supabase.rpc("dwaar_closed_chats");
  return new Set(data ?? []);
}

// What the chat page and the live updates send to the browser (plain data).
export type ChatMessageView = { id: number; mine: boolean; body: string; at: string };
export const toMessageViews = (messages: ChatMessage[]): ChatMessageView[] =>
  messages.map((m) => ({ id: m.out_id, mine: m.out_mine, body: m.out_body, at: m.out_created_at }));

// Resume sharing for this chat: whether the candidate shares it, and (for the employee) whether there is a file to open.
export type ChatResume = { isCandidate: boolean; shared: boolean; hasResume: boolean; path: string | null };

export async function getChatResume(supabase: Db, requestId: string): Promise<ChatResume | null> {
  const { data, error } = await supabase.rpc("dwaar_chat_resume", { p_request_id: requestId });
  if (error) {
    console.error("[dwaar] could not load resume sharing", { code: error.code });
    return null;
  }
  const row = data?.[0];
  return row ? { isCandidate: row.out_is_candidate, shared: row.out_shared, hasResume: row.out_has_resume, path: row.out_path } : null;
}
