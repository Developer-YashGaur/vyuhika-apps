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

type Params = { need?: string };

export default function DwaarProfilePage({ searchParams }: { searchParams: Promise<Params> }) {
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
          <ProfileContent searchParams={searchParams} />
        </Suspense>
      </div>
  );
}

// Reads the signed-in person, so it sits inside <Suspense>. Signed-out visitors go back to the Dwaar front page.
async function ProfileContent({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams; // sign-in checks read the clock, which Next.js only allows at request time
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const [profile, companies] = await Promise.all([getMyProfile(supabase, data.user.id), listCompanyOptions(supabase)]);
  const googleName = typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : "";

  return (
    <>
    {params.need === "details" && (
      <p role="status" className="dw-alert dw-alert-info mb-6">
        Companies ask for your LinkedIn link, phone number and skills. Please add them, then ask for your referral.
      </p>
    )}
    <ProfileForm
      key={profile?.updated_at ?? "new"} // a fresh form after every save: Next.js keeps pages you left alive, and their old typed values would come back
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
        linkedinUrl: profile?.linkedin_url ?? "",
        phone: profile?.phone ?? "",
        otherLinks: (profile?.other_links ?? []).join("\n"),
        skills: (profile?.skills ?? []).join(", "),
      }}
    />
    </>
  );
}
