import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import JobAlertForm from "@/components/dwaar/JobAlertForm";
import JobCard from "@/components/dwaar/JobCard";
import { jobsFeedEnabled, planPaymentsEnabled } from "@/lib/dwaar/features";
import { getMyAlert } from "@/lib/dwaar/job-alerts";
import { getMyPlan } from "@/lib/dwaar/plan";
import { feedCredit } from "@/lib/dwaar/jobs-feed";
import { listLatestJobs } from "@/lib/dwaar/jobs";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="dw-wrap dw-page">
      <p className="dw-eyebrow">Latest jobs</p>
      <h1 className="dw-title dw-display mt-2 mb-3">Fresh jobs, twice a day</h1>
      <p className="mb-8 max-w-2xl text-lg leading-relaxed dw-muted">
        The newest roles from public job sources. Pick one, check your match, then ask someone inside for a referral.
      </p>
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <JobsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function JobsContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  if (!jobsFeedEnabled() || !supabaseConfigured()) notFound();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const supabase = await createClient();
  const jobs = await listLatestJobs(supabase, query || null, 20);
  const sources = Array.from(new Set(jobs.map((j) => j.source)));

  // Job alerts are for Plus members. Everyone else sees a short note about them.
  const { data: auth } = await supabase.auth.getUser();
  const signedIn = Boolean(auth.user);
  const plan = signedIn && planPaymentsEnabled() ? await getMyPlan(supabase) : null;
  const alert = plan?.active ? await getMyAlert(supabase) : null;

  return (
    <>
      <form action="/apps/dwaar/jobs" method="get" role="search" className="dw-jobsearch">
        <label htmlFor="dw-q" className="sr-only">
          Search jobs by role, company or place
        </label>
        <input id="dw-q" name="q" defaultValue={query} maxLength={80} placeholder="Search by role, company or place" className="dw-input" />
        <button type="submit" className="dw-btn dw-btn-primary">
          Search jobs
        </button>
      </form>

      {plan?.active ? (
        <div className="mt-6">
          <JobAlertForm keywords={alert?.keywords ?? ""} active={alert?.active ?? false} />
        </div>
      ) : signedIn && planPaymentsEnabled() ? (
        <p className="dw-muted mt-4 text-sm">
          Want an email when new jobs match? Job alerts are part of{" "}
          <Link href="/apps/dwaar/plus" className="dw-link">
            Dwaar Plus
          </Link>
          .
        </p>
      ) : null}

      {jobs.length === 0 ? (
        <section className="dw-card mt-6">
          <h2 className="dw-display text-xl">{query ? "No jobs match that search" : "No jobs yet"}</h2>
          <p className="dw-muted mt-2">{query ? "Try a shorter word, like a role or a city." : "The next update will add new jobs."}</p>
          {query && (
            <Link href="/apps/dwaar/jobs" className="dw-btn dw-btn-quiet mt-4">
              Show all jobs
            </Link>
          )}
        </section>
      ) : (
        <div className="dw-jobs mt-6">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}

      <p className="dw-muted mt-8 text-sm">
        Jobs come from{" "}
        {sources.length === 0
          ? "public job sources"
          : sources.map((s, i) => (
              <span key={s}>
                {i > 0 ? " and " : ""}
                <a href={feedCredit(s).href} target="_blank" rel="noopener noreferrer nofollow" className="dw-link">
                  {feedCredit(s).name}
                </a>
              </span>
            ))}{" "}
        and are checked each time before they appear. Always confirm details on the original posting.
      </p>
    </>
  );
}
