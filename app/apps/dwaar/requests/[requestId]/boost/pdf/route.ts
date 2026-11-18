import { resumePdfFileName } from "@/lib/dwaar/file-name";
import { loadBoostResume } from "@/lib/dwaar/boost-resume";
import { resumeToPdf } from "@/lib/dwaar/pdf";
import { resumeDisplayName } from "@/lib/dwaar/resume-doc";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Download PDF": sends the resume as a real PDF file named like "Asha-Rao_Python-Backend-Developer.pdf".
// Only the person who owns the Boost can download it.
export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!UUID.test(requestId) || !supabaseConfigured()) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Please sign in", { status: 401 });

  const boost = await loadBoostResume(supabase, auth.user, requestId);
  if (!boost?.doc) return new Response("Not found", { status: 404 });

  const fileName = resumePdfFileName(resumeDisplayName(boost.doc, boost.contact.name), boost.jobTitle);
  const pdf = resumeToPdf(boost.doc, boost.contact);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
