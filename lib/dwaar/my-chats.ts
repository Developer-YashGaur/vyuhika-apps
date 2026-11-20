import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// All my chats in one list: as a candidate (one per accepted request, so possibly with several employees) and as an
// employee (one per candidate I accepted). The database returns only chats I take part in.

type Db = SupabaseClient<Database>;

export type ChatSummary = {
  requestId: string;
  jobTitle: string;
  company: string;
  otherName: string;
  isCandidate: boolean;
  lastBody: string | null;
  lastAt: string | null;
  lastMine: boolean | null;
  messageCount: number;
  acceptedAt: string;
  unread: number;
};

export async function listMyChats(supabase: Db): Promise<ChatSummary[]> {
  const { data, error } = await supabase.rpc("dwaar_my_chats");
  if (error) {
    console.error("[dwaar] could not load chats", { code: error.code });
    return [];
  }
  return (data ?? []).map((r) => ({
    requestId: r.out_request_id,
    jobTitle: r.out_job_title,
    company: r.out_company_name,
    otherName: r.out_other_name,
    isCandidate: r.out_is_candidate,
    lastBody: r.out_last_body,
    lastAt: r.out_last_at,
    lastMine: r.out_last_mine,
    messageCount: r.out_message_count,
    acceptedAt: r.out_accepted_at,
    unread: r.out_unread,
  }));
}

// One short line under each chat: who wrote last, and the start of the message.
export function chatPreview(chat: Pick<ChatSummary, "lastBody" | "lastMine" | "otherName">, max = 90): string {
  if (!chat.lastBody) return "No messages yet. Say hello.";
  const text = chat.lastBody.replace(/\s+/g, " ").trim();
  const short = text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return `${chat.lastMine ? "You" : chat.otherName}: ${short}`;
}
