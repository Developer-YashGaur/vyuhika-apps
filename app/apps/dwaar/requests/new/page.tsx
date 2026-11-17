import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import RequestForm from "@/components/dwaar/RequestForm";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyProfile, listCompanyOptions } from "@/lib/dwaar/profile";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function NewRequestPage() {
  return (
    <>
      <Navbar />
      <main id="top" className="gutter pt-28 pb-28 sm:pt-32">
        <Link href="/apps/dwaar/requests" className="back-link">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          My requests
        </Link>
        <h1 className="page-title font-display mt-8 mb-3">Ask for a referral</h1>
        <p className="measure mb-10 text-lg leading-relaxed text-mist">
          Sign the visitor book. Employees at the company will see your request and one of them may accept it.
        </p>
        <Suspense fallback={<p className="text-mist">Loading…</p>}>
          <NewRequestContent />
        </Suspense>
      </main>
      <Footer />
    </>
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

  const companies = await listCompanyOptions(supabase);
  return <RequestForm companies={companies} />;
}
