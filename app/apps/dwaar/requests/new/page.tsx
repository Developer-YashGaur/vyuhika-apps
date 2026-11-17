import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import RequestForm from "@/components/dwaar/RequestForm";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyProfile, listCompanyOptions } from "@/lib/dwaar/profile";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function NewRequestPage() {
  return (
    <div className="dw-wrap dw-page">
        <Link href="/apps/dwaar/requests" className="dw-back">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          My requests
        </Link>
        <h1 className="dw-title dw-display mt-8 mb-3">Ask for a referral</h1>
        <p className=" mb-10 text-lg leading-relaxed dw-muted">
          Pick the company and the job, add your resume, and send your request. Employees at the company will see it, and one of them may accept.
        </p>
        <Suspense fallback={<p className="dw-muted">Loading…</p>}>
          <NewRequestContent />
        </Suspense>
      </div>
  );
}

async function NewRequestContent() {
  await connection();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile) redirect("/apps/dwaar/profile");
  if (!profile.is_candidate) redirect("/apps/dwaar/profile");

  // People who work at a company cannot ask for a referral there, so it is left out of the list.
  const all = await listCompanyOptions(supabase);
  const own = profile.is_provider ? profile.provider_company_id : null;
  return <RequestForm companies={all.filter((c) => c.id !== own)} />;
}
