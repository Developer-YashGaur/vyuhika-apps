import Link from "next/link";
import { connection } from "next/server";
import { timeAgo } from "@/lib/dwaar/format";
import { jobsFeedEnabled } from "@/lib/dwaar/features";
import { listLatestJobs } from "@/lib/dwaar/jobs";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import CompanyMonogram from "@/components/dwaar/CompanyMonogram";

// A short "Latest jobs" strip for the front page. It shows nothing until the feed is switched on and has jobs.
export default async function LatestJobsStrip() {
  await connection();
  if (!jobsFeedEnabled() || !supabaseConfigured()) return null;
  const supabase = await createClient();
  const jobs = await listLatestJobs(supabase, null, 4);
  if (jobs.length === 0) return null;
  return (
    <section aria-labelledby="dw-latest" className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dw-eyebrow">Updated twice a day</p>
          <h2 id="dw-latest" className="dw-h2 dw-display mt-2">
            Latest jobs
          </h2>
        </div>
        <Link href="/apps/dwaar/jobs" className="dw-btn dw-btn-quiet">
          See all jobs
        </Link>
      </div>
      <form action="/apps/dwaar/jobs" method="get" role="search" className="dw-jobsearch mt-5">
        <label htmlFor="dw-hq" className="sr-only">
          Search jobs by role, company or place
        </label>
        <input id="dw-hq" name="q" maxLength={80} placeholder="Search by role, company or place" className="dw-input" />
        <button type="submit" className="dw-btn dw-btn-primary">
          Search jobs
        </button>
      </form>
      <ul className="dw-strip mt-5">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link href="/apps/dwaar/jobs" className="dw-strip-card">
              <CompanyMonogram name={j.company} />
              <span className="min-w-0">
                <strong className="dw-job-title block">{j.title}</strong>
                <span className="dw-muted block text-sm">{j.company}{j.location ? ` · ${j.location}` : ""}</span>
                {j.postedAt && <span className="dw-muted block text-xs">Posted {timeAgo(j.postedAt)}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
