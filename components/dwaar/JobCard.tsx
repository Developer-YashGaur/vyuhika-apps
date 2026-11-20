import Link from "next/link";
import CompanyMonogram from "@/components/dwaar/CompanyMonogram";
import { timeAgo } from "@/lib/dwaar/format";
import type { JobView } from "@/lib/dwaar/jobs";

// One job from the Latest jobs feed. "Ask for a referral" opens the request form with the job already filled in.
export default function JobCard({ job }: { job: JobView }) {
  const ask = `/apps/dwaar/requests/new?${new URLSearchParams({ title: job.title.slice(0, 120), url: job.url })}`;
  return (
    <article className="dw-job">
      <div className="dw-job-head">
        <CompanyMonogram name={job.company} />
        <div className="min-w-0">
          <h3 className="dw-job-title">{job.title}</h3>
          <p className="dw-muted text-sm">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
            {job.postedAt ? ` · Posted ${timeAgo(job.postedAt)}` : ""}
          </p>
        </div>
      </div>
      {job.description && <p className="dw-job-text">{job.description}</p>}
      <div className="dw-job-actions">
        <Link href={ask} className="dw-btn dw-btn-primary dw-btn-sm">
          Ask for a referral
        </Link>
        <a href={job.url} target="_blank" rel="noopener noreferrer nofollow" className="dw-btn dw-btn-quiet dw-btn-sm">
          View original posting
        </a>
      </div>
    </article>
  );
}
