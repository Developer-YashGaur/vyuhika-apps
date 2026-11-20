import { getChatResume } from "@/lib/dwaar/chat";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "View resume" for the employee who accepted: hands out a link that works for one minute. The database decides: only
// the employee who accepted, and only while the candidate shares the resume. The storage rules check the same again.
export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!UUID.test(requestId) || !supabaseConfigured()) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Please sign in", { status: 401 });

  const resume = await getChatResume(supabase, requestId);
  if (!resume?.path) return new Response("This resume is not shared.", { status: 404 });
  const signed = await supabase.storage.from("dwaar-resumes").createSignedUrl(resume.path, 60);
  if (signed.error || !signed.data?.signedUrl) return new Response("Could not open the resume.", { status: 404 });
  return Response.redirect(signed.data.signedUrl, 302);
}
