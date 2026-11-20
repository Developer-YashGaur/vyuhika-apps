import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import CopyButton from "@/components/dwaar/CopyButton";
import NextChoices from "@/components/dwaar/NextChoices";
import ReplaceResume from "@/components/dwaar/ReplaceResume";
import ResumeView from "@/components/dwaar/ResumeView";
import { boostNextStep } from "@/lib/dwaar/boost-next";
import { loadBoostResume } from "@/lib/dwaar/boost-resume";
import { resumeDocToText } from "@/lib/dwaar/resume-doc";
import { checkBoostScoreAction } from "@/app/apps/dwaar/actions";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { listMyAnalyses, toStringList } from "@/lib/dwaar/requests";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BoostResultPage({ params, searchParams }: { params: Promise<{ requestId: string }>; searchParams: Promise<{ score?: string; replaced?: string }> }) {
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
          <BoostResult params={params} searchParams={searchParams} />
        </Suspense>
      </div>
  );
}

async function BoostResult({ params, searchParams }: { params: Promise<{ requestId: string }>; searchParams: Promise<{ score?: string; replaced?: string }> }) {
  await connection();
  const { requestId } = await params;
  const { score, replaced } = await searchParams;
  if (!UUID.test(requestId)) notFound();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/apps/dwaar");

  const boost = await loadBoostResume(supabase, auth.user, requestId);
  if (!boost) notFound();
  const { doc, contact } = boost;

  const analyses = await listMyAnalyses(supabase);
  const before = doc?.originalScore ?? analyses.find((a) => a.requestId === requestId && a.status === "done")?.score ?? null;
  const checked = /^\d{1,3}$/.test(score ?? "") ? Math.min(100, Number(score)) : null;
  const after = doc?.matchScore ?? checked;
  const next = boostNextStep(after ?? before, after === null ? null : before);
  const copyText = doc ? resumeDocToText(doc, contact) : boost.raw;
  const result = { summary: boost.summary, improved_resume: boost.raw, changes: boost.changes, profile_tips: boost.profileTips, linkedin_tips: boost.linkedinTips };

  const changes = toStringList(result.changes);
  const profileTips = toStringList(result.profile_tips);
  const linkedinTips = toStringList(result.linkedin_tips);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={next.good ? "dw-alert dw-alert-good lg:col-span-2" : "dw-alert dw-alert-info lg:col-span-2"}>
        <h2 className="dw-display text-xl font-medium">{next.title}</h2>
        <p className="mt-1 leading-relaxed">{result.summary || next.text}</p>
        {after !== null && (
          <p className="mt-2 text-sm leading-relaxed">
            <strong>Score for this job:</strong> {before !== null ? `${before} before the Boost, ` : ""}
            {after} for the improved resume.{" "}
            {before !== null && after < before
              ? "The improved resume scores lower, so your original may be the better fit. Compare them before you decide. "
              : ""}
            {doc?.stillMissing && doc.stillMissing.length > 0 ? `Still not shown in the resume: ${doc.stillMissing.join(", ")}. Add these only if they are true for you.` : ""}
          </p>
        )}
        {after === null && doc && (
          <form action={checkBoostScoreAction} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="requestId" value={requestId} />
            <button type="submit" className="dw-btn dw-btn-quiet">
              Check the new score
            </button>
            <span className="text-sm">
              {score === "failed" ? "We could not check it just now. Please try again." : "This Boost was written before scores were added. This scores the improved resume for the same job."}
            </span>
          </form>
        )}
        <p className="mt-1 text-sm leading-relaxed">{next.text}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href={`/apps/dwaar/requests/${requestId}/boost/pdf`} download className="dw-btn dw-btn-primary">
            Download PDF
          </a>
          <CopyButton text={copyText} label="Copy as text" />
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          The PDF is named with your name and the role you applied for. This was written by an AI from your own
          resume, so read every line and keep only what is true. Replace each [placeholder] with your real details.
        </p>
      </section>

      {doc && <ReplaceResume requestId={requestId} result={replaced ?? null} open={boost.requestStatus === "open"} />}

      <NextChoices requestId={requestId} good={next.good} />

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
