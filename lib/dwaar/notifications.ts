import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// In-app notifications: how many unread chat items I have, in how many chats, and how many requests wait for me as an
// employee. The database counts; nothing here holds message text.

type Db = SupabaseClient<Database>;

export type NotificationCounts = { unread: number; unreadChats: number; waitingRequests: number };

export async function getNotificationCounts(supabase: Db): Promise<NotificationCounts | null> {
  const { data, error } = await supabase.rpc("dwaar_notification_counts");
  if (error) {
    console.error("[dwaar] could not load notification counts", { code: error.code });
    return null;
  }
  const row = data?.[0];
  return row ? { unread: row.out_unread, unreadChats: row.out_unread_chats, waitingRequests: row.out_waiting_requests } : { unread: 0, unreadChats: 0, waitingRequests: 0 };
}

// Marks a chat as read (the person has it open). Best effort: a failure never blocks the chat.
export async function markChatRead(supabase: Db, requestId: string): Promise<void> {
  const { error } = await supabase.rpc("dwaar_mark_chat_read", { p_request_id: requestId });
  if (error) console.error("[dwaar] could not mark the chat as read", { code: error.code });
}

// "3", or "9+" for ten or more. Empty for none.
export function badgeText(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "";
  return count > 9 ? "9+" : String(Math.floor(count));
}

// The browser tab title with the count in front: "(3) Your chats".
export function titleWithCount(base: string, count: number): string {
  const clean = base.replace(/^\(\d+\+?\)\s*/, "");
  return count > 0 ? `(${count > 99 ? "99+" : count}) ${clean}` : clean;
}
