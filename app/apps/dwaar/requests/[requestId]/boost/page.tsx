import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CopyButton from "@/components/dwaar/CopyButton";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { toStringList } from "@/lib/dwaar/requests";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BoostResultPage({ params }: { params: Promise<{ requestId: string }> }) {
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
        <h1 className="page-title font-display mt-8 mb-10">Your Boost</h1>
        <Suspense fallback={<p className="text-mist">Loading…</p>}>
          <BoostResult params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function BoostResult({ params }: { params: Promise<{ requestId: string }> }) {
  await connection();
  const { requestId } = await params;
  if (!UUID.test(requestId)) notFound();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/apps/dwaar");

  // The database only ever returns my own result (row-level security).
  const { data: result } = await supabase
    .from("dwaar_boost_results")
    .select("improved_resume, summary, changes, profile_tips, linkedin_tips, status")
    .eq("request_id", requestId)
    .eq("status", "done")
    .maybeSingle();
  if (!result?.improved_resume) notFound();

  const changes = toStringList(result.changes);
  const profileTips = toStringList(result.profile_tips);
  const linkedinTips = toStringList(result.linkedin_tips);

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="dw-paper">
        <p className="text-lg leading-relaxed">{result.summary}</p>
        <p className="dw-muted mt-3 text-sm leading-relaxed">
          This was written by an AI from your own resume. Read every line and keep only what is true. Replace each
          [placeholder] with your real details, and add your name and contact details yourself.
        </p>
      </section>

      <section className="dw-paper">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-medium">Your improved resume</h2>
          <CopyButton text={result.improved_resume} label="Copy resume" />
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{result.improved_resume}</pre>
      </section>

      <TipList title="What we changed" items={changes} />
      <TipList title="Profile tips" items={profileTips} />
      <TipList title="LinkedIn tips" items={linkedinTips} />

      <p className="dw-muted max-w-2xl text-sm leading-relaxed">
        Copy what you want to keep. Your Boost is deleted when you cancel this request, and 90 days after the request closes.
      </p>
    </div>
  );
}

function TipList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="dw-paper">
      <h2 className="font-display text-xl font-medium">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
