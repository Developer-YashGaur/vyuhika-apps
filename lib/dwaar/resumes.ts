import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Removing a person's resume data. Files are deleted from storage with the PERSON'S OWN session (the storage rules
// only let them delete inside their own folder), and only then the database is cleared. If deleting the files fails,
// nothing is cleared, so we never lose track of a file that is still stored.

type Db = SupabaseClient<Database>;
const BUCKET = "dwaar-resumes";

export type RemoveResult = { ok: true; files: number } | { ok: false };

// With a request id: that request only. Without one: every request of the signed-in person.
export async function removeMyResumes(supabase: Db, requestId?: string): Promise<RemoveResult> {
  const query = supabase.from("dwaar_referral_requests").select("resume_path").not("resume_path", "is", null);
  const { data, error } = await (requestId ? query.eq("id", requestId) : query);
  if (error) {
    console.error("[dwaar] could not list resume files", { code: error.code });
    return { ok: false };
  }

  const paths = (data ?? []).map((row) => row.resume_path).filter((path): path is string => typeof path === "string" && path.length > 0);
  if (paths.length > 0) {
    const removed = await supabase.storage.from(BUCKET).remove(paths);
    if (removed.error) {
      console.error("[dwaar] could not delete resume files");
      return { ok: false };
    }
  }

  const cleared = await supabase.rpc("dwaar_forget_my_requests", requestId ? { p_request_id: requestId } : {});
  if (cleared.error) {
    console.error("[dwaar] could not clear resume data", { code: cleared.error.code });
    return { ok: false };
  }
  return { ok: true, files: paths.length };
}
