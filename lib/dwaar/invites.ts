import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { site } from "@/lib/site";

// Invite codes and credits. A friend enters a code before their first request. When the friend sends their first
// real request, the database gives both people credits. The database decides everything; this code words the answers.

type Db = SupabaseClient<Database>;

export type RedeemStatus = "ok" | "off" | "bad_code" | "own_code" | "already" | "too_late";

export const INVITE_MESSAGES = {
  empty: "Please type the invite code first.",
  ok: "Code saved. You and your friend each get 10 credits after you send your first request.",
  off: "Invite codes are not open yet.",
  bad_code: "We could not find that code. Please check it and try again.",
  own_code: "You cannot use your own code.",
  already: "You have already used an invite code.",
  too_late: "Invite codes only work before your first request.",
  failed: "Something went wrong. Please try again in a moment.",
} as const;

// Codes are 8 lowercase letters or digits. Friends may paste with spaces or capitals.
export function normalizeCode(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

export function inviteLink(code: string): string {
  return `${site.url}/apps/dwaar?invite=${encodeURIComponent(code)}`;
}

export type RedeemResult = { ok: true; message: string } | { ok: false; message: string };

export async function redeemInvite(supabase: Db, raw: unknown): Promise<RedeemResult> {
  const code = normalizeCode(raw);
  if (code.length !== 8) return { ok: false, message: code ? INVITE_MESSAGES.bad_code : INVITE_MESSAGES.empty };
  const { data, error } = await supabase.rpc("dwaar_use_invite", { p_code: code });
  if (error) return { ok: false, message: INVITE_MESSAGES.failed };
  if (data === "ok") return { ok: true, message: INVITE_MESSAGES.ok };
  if (data === "off" || data === "bad_code" || data === "own_code" || data === "already" || data === "too_late") {
    return { ok: false, message: INVITE_MESSAGES[data] };
  }
  return { ok: false, message: INVITE_MESSAGES.failed };
}

export type InviteSummary = { code: string; credits: number };

// null if something fails: the page then simply leaves the invite card out.
export async function getInviteSummary(supabase: Db): Promise<InviteSummary | null> {
  const [code, credits] = await Promise.all([supabase.rpc("dwaar_my_invite_code"), supabase.rpc("dwaar_credit_balance")]);
  if (code.error || credits.error || typeof code.data !== "string") return null;
  return { code: code.data, credits: credits.data ?? 0 };
}
