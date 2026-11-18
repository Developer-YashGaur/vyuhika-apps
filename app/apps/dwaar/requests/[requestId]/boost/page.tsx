import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import CopyButton from "@/components/dwaar/CopyButton";
import PrintButton from "@/components/dwaar/PrintButton";
import ResumeView from "@/components/dwaar/ResumeView";
import { boostNextStep } from "@/lib/dwaar/boost-next";
import { getMyProfile } from "@/lib/dwaar/profile";
import { resumeFileName } from "@/lib/dwaar/file-name";
import { parseResumeDoc, resumeDisplayName, resumeDocToText, type ResumeContact } from "@/lib/dwaar/resume-doc";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { listMyAnalyses, toStringList } from "@/lib/dwaar/requests";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BoostResultPage({ params }: { params: Promise<{ requestId: string }> }) {
  return (
    <div className="dw-wrap dw-page">
        <Link href="/apps/dwaar/requests" className="dw-back">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          My requests
        </Link>
        <h1 className="dw-title dw-display mt-8 mb-10">Your Boost</h1>
        <Suspense fallback={<p className="dw-muted">Loading…</p>}>
          <BoostResult params={params} />
        </Suspense>
      </div>
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

  const [profile, analyses] = await Promise.all([getMyProfile(supabase, auth.user.id), listMyAnalyses(supabase)]);
  const score = analyses.find((a) => a.requestId === requestId && a.status === "done")?.score ?? null;
  const next = boostNextStep(score);
  const doc = parseResumeDoc(result.improved_resume);
  // Contact details come from the person's own profile and sign-in. The AI never sees or writes them.
  const contact: ResumeContact = {
    name: profile?.display_name ?? "",
    email: auth.user.email ?? null,
    phone: profile?.phone ?? null,
    linkedin: profile?.linkedin_url ?? null,
    links: profile?.other_links ?? [],
  };
  const fileName = resumeFileName(doc ? resumeDisplayName(doc, contact.name) : contact.name);
  const copyText = doc ? resumeDocToText(doc, contact) : result.improved_resume;

  const changes = toStringList(result.changes);
  const profileTips = toStringList(result.profile_tips);
  const linkedinTips = toStringList(result.linkedin_tips);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={next.good ? "dw-alert dw-alert-good lg:col-span-2" : "dw-alert dw-alert-info lg:col-span-2"}>
        <h2 className="dw-display text-xl font-medium">{next.title}</h2>
        <p className="mt-1 leading-relaxed">{result.summary || next.text}</p>
        <p className="mt-1 text-sm leading-relaxed">{next.text}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrintButton fileName={fileName} />
          <CopyButton text={copyText} label="Copy as text" />
          {next.good && (
            <Link href="/apps/dwaar/requests" className="dw-btn dw-btn-quiet">
              Continue with my request
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          To save a PDF, choose Download PDF and then &ldquo;Save as PDF&rdquo; in the window that opens. This was written by an AI from your own
          resume, so read every line and keep only what is true. Replace each [placeholder] with your real details.
        </p>
      </section>

      <section id="resume-preview" className="scroll-mt-24 lg:col-span-2">
        <h2 className="dw-display mb-3 text-xl font-medium">Preview of your resume</h2>
        {doc ? (
          <ResumeView doc={doc} contact={contact} />
        ) : (
          <div className="dw-card">
            <h2 className="dw-display text-xl font-medium">Your improved resume</h2>
            <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{result.improved_resume}</pre>
          </div>
        )}
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
    <section className="dw-card">
      <h2 className="dw-display text-xl font-medium">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
