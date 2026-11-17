import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { cancelRequestAction } from "@/app/apps/dwaar/actions";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import BoostButton from "@/components/dwaar/BoostButton";
import BoostForm from "@/components/dwaar/BoostForm";
import ScoreCard from "@/components/dwaar/ScoreCard";
import VisitorPass from "@/components/dwaar/VisitorPass";
import { listMyBoosts, type MyBoost } from "@/lib/dwaar/boost";
import { statusStamp, timeAgo } from "@/lib/dwaar/format";
import { passNumber } from "@/lib/dwaar/monogram";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { getMyProfile } from "@/lib/dwaar/profile";
import { listMyAnalyses, listMyRequests, type Analysis, type MyRequest } from "@/lib/dwaar/requests";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

type Params = { sent?: string; cancelled?: string; check?: string };

export default function MyRequestsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <Navbar />
      <main id="top" className="gutter pt-28 pb-28 sm:pt-32">
        <Link href="/apps/dwaar" className="back-link">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dwaar
        </Link>
        <div className="mt-8 mb-10 flex flex-wrap items-end justify-between gap-5">
          <h1 className="page-title font-display">My requests</h1>
          <Link href="/apps/dwaar/requests/new" className="btn-glow btn-lg">
            Ask for a referral
          </Link>
        </div>
        <Suspense fallback={<p className="text-mist">Loading…</p>}>
          <RequestsContent searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function RequestsContent({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile) redirect("/apps/dwaar/profile");

  const [requests, analyses, boosts] = await Promise.all([listMyRequests(supabase), listMyAnalyses(supabase), listMyBoosts(supabase)]);
  const analysisById = new Map(analyses.map((a) => [a.requestId, a]));
  const checkNote: Record<string, string> = {
    done: " Your resume match score is ready on the pass below.",
    limit: " You have used today's 5 resume checks, so there is no score this time.",
    failed: " We could not check your resume right now.",
  };
  const info = params.sent
    ? `Your request is at reception. Employees at that company can now see it.${checkNote[params.check ?? ""] ?? ""}`
    : params.cancelled
      ? "Your request was cancelled."
      : null;

  return (
    <>
      {info && (
        <p role="status" className="mb-6 max-w-2xl rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
          {info}
        </p>
      )}

      {requests.length === 0 ? (
        <section className="dw-paper max-w-2xl">
          <h2 className="font-display text-xl font-medium">No visits yet</h2>
          <p className="dw-muted mt-3 leading-relaxed">
            When you ask for a referral, a visitor pass for that company appears here, and you can follow it from
            &ldquo;Waiting at reception&rdquo; to an answer.
          </p>
          <Link href="/apps/dwaar/requests/new" className="btn-glow btn-lg mt-6 inline-flex">
            Ask for a referral
          </Link>
        </section>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((r) => (
            <li key={r.out_id}>
              <RequestPass request={r} analysis={analysisById.get(r.out_id)} boost={boosts.get(r.out_id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RequestPass({ request: r, analysis, boost }: { request: MyRequest; analysis?: Analysis; boost?: MyBoost }) {
  const stamp = statusStamp(r.out_status);
  return (
    <VisitorPass
      number={passNumber(r.out_id)}
      company={r.out_company_name}
      title={r.out_job_title}
      meta={`Asked ${timeAgo(r.out_created_at)}`}
      stamp={stamp.label}
      stampTone={stamp.tone}
    >
      {analysis && <div className="mb-3"><ScoreCard analysis={analysis} /></div>}
      {r.out_note && <p className="dw-muted mb-3 text-sm italic">&ldquo;{r.out_note}&rdquo;</p>}
      {r.out_status === "accepted" && (
        <p className="mb-3 text-sm">
          <strong>{r.out_accepted_by_name}</strong> accepted your request. They have your email and may write to you.
        </p>
      )}
      {boost?.status === "delivered" ? (
        <p className="mb-3 text-sm">
          <strong>Your Boost is ready.</strong>{" "}
          <Link href={`/apps/dwaar/requests/${r.out_id}/boost`} className="dw-link">
            Open it
          </Link>
        </p>
      ) : boost?.status === "paid" ? (
        <BoostForm orderId={boost.orderId} />
      ) : (
        r.out_has_resume && <BoostButton requestId={r.out_id} />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a href={r.out_job_url} target="_blank" rel="noopener noreferrer" className="dw-link text-sm">
          View the job posting
        </a>
        {r.out_status === "open" && (
          <form action={cancelRequestAction} className="ml-auto">
            <input type="hidden" name="requestId" value={r.out_id} />
            <button type="submit" className="btn-ghost btn-sm">
              Cancel request
            </button>
          </form>
        )}
      </div>
    </VisitorPass>
  );
}
