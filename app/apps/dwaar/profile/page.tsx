import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import ProfileForm from "@/components/dwaar/ProfileForm";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyProfile, listCompanyOptions } from "@/lib/dwaar/profile";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function DwaarProfilePage() {
  return (
    <div className="dw-wrap dw-page">
        <Link href="/apps/dwaar" className="dw-back">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dwaar
        </Link>
        <h1 className="dw-title dw-display mt-8 mb-10">Your profile</h1>
        <Suspense fallback={<p className="dw-muted">Loading…</p>}>
          <ProfileContent />
        </Suspense>
      </div>
  );
}

// Reads the signed-in person, so it sits inside <Suspense>. Signed-out visitors go back to the Dwaar front page.
async function ProfileContent() {
  await connection(); // sign-in checks read the clock, which Next.js only allows at request time
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const [profile, companies] = await Promise.all([getMyProfile(supabase, data.user.id), listCompanyOptions(supabase)]);
  const googleName = typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : "";

  return (
    <ProfileForm
      isNew={profile === null}
      accountEmail={data.user.email ?? ""}
      companies={companies}
      initial={{
        displayName: profile?.display_name ?? googleName,
        headline: profile?.headline ?? "",
        isCandidate: profile?.is_candidate ?? true,
        isProvider: profile?.is_provider ?? false,
        companyId: profile?.provider_company_id ?? "",
        workEmail: profile?.provider_work_email ?? "",
        acceptsRequests: profile?.accepts_requests ?? false,
        weeklyLimit: String(profile?.weekly_request_limit ?? 5),
      }}
    />
  );
}
