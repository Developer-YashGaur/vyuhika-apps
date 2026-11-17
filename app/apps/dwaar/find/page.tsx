import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import FindJobsForm from "@/components/dwaar/FindJobsForm";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyProfile } from "@/lib/dwaar/profile";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;
// Searching the web and checking links can take close to a minute.
export const maxDuration = 60;

export default function FindJobsPage() {
  return (
    <div className="dw-wrap dw-page">
      <Link href="/apps/dwaar" className="dw-back">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Dwaar
      </Link>
      <h1 className="dw-title dw-display mt-8 mb-3">Find jobs for my resume</h1>
      <p className="mb-10 max-w-2xl text-lg leading-relaxed dw-muted">
        Not sure which job to ask about? Add your resume and we suggest the jobs that fit it, and the companies where employees
        are ready to refer.
      </p>
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <FindJobsContent />
      </Suspense>
    </div>
  );
}

async function FindJobsContent() {
  await connection();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile || !profile.is_candidate) redirect("/apps/dwaar/profile");

  // Only company names and how many employees accept requests. No employee details.
  const { data: rows } = await supabase.rpc("dwaar_companies_with_referrers");
  const companies = (rows ?? []).map((r) => ({ id: r.out_company_id, name: r.out_company_name, referrers: r.out_referrers }));
  return <FindJobsForm companies={companies} />;
}
