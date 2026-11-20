import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getContactState, isContactKind } from "@/lib/dwaar/contact";
import type { ContactView } from "@/lib/dwaar/chat-timeline";

type Db = SupabaseClient<Database>;

// Phone and email questions with their times, for the live chat. The value (number or email) is filled in by the database
// only for the employee, and only after the candidate shared it.
export async function getContactViews(supabase: Db, requestId: string): Promise<ContactView[]> {
  const [timeline, state] = await Promise.all([supabase.rpc("dwaar_contact_timeline", { p_request_id: requestId }), getContactState(supabase, requestId)]);
  if (timeline.error) throw new Error("Could not load contact requests.");
  return (timeline.data ?? []).flatMap((t) => {
    const status = t.out_status;
    if (!isContactKind(t.out_kind) || (status !== "pending" && status !== "shared" && status !== "declined")) return [];
    return [{ kind: t.out_kind, status, value: state.find((s) => s.kind === t.out_kind)?.value ?? null, askedAt: t.out_asked_at, answeredAt: t.out_answered_at }];
  });
}
