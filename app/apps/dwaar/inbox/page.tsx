import { EARN_ACCEPT, EARN_INTERVIEW, EARN_OFFER, getMyEarnings } from "@/lib/dwaar/earnings";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { respondToRequestAction } from "@/app/apps/dwaar/actions";
import CandidateDetails from "@/components/dwaar/CandidateDetails";
import CompanyMonogram from "@/components/dwaar/CompanyMonogram";
import RequestCard from "@/components/dwaar/RequestCard";
import { timeAgo } from "@/lib/dwaar/format";
import MatchSummary from "@/components/dwaar/MatchSummary";
import { getCandidateExtras } from "@/lib/dwaar/candidate-extras";
import { getCandidateMatches } from "@/lib/dwaar/candidate-match";
import { ANSWER_NOTES, listAccepted, listInbox, type Answer } from "@/lib/dwaar/inbox";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { passNumber } from "@/lib/dwaar/monogram";
import { getMyProfile, listCompanyOptions } from "@/lib/dwaar/profile";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

type Params = { answer?: string };

export default function InboxPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="dw-wrap dw-page">
        <Suspense fallback={<p className="mt-8 dw-muted">Loading…</p>}>
          <InboxContent searchParams={searchParams} />
        </Suspense>
      </div>
  );
}

async function InboxContent({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile) redirect("/apps/dwaar/profile");

  const confirmed = profile.is_provider && profile.provider_company_id && profile.work_email_verified_at;
  if (!confirmed) {
    return (
      <>
        <h1 className="dw-title dw-display mb-8">Employee desk</h1>
        <section className="dw-card">
          <h2 className="dw-display text-xl">This desk is for confirmed employees</h2>
          <p className="dw-muted mt-3 leading-relaxed">
            {profile.is_provider
              ? "Confirm your work email on the Dwaar front page first. Then candidates asking for a referral at your company appear here."
              : "To answer referral requests, turn on \"I can refer people\" in your profile, choose your company and confirm your work email."}
          </p>
          <Link href={profile.is_provider ? "/apps/dwaar" : "/apps/dwaar/profile"} className="dw-btn dw-btn-primary dw-btn-lg mt-6 inline-flex">
            {profile.is_provider ? "Go to Dwaar" : "Edit my profile"}
          </Link>
        </section>
      </>
    );
  }

  if (!profile.accepts_requests) {
    return (
      <>
        <h1 className="dw-title dw-display mb-8">Employee desk</h1>
        <section className="dw-card">
          <h2 className="dw-display text-xl">Referral requests are switched off</h2>
          <p className="dw-muted mt-3 leading-relaxed">
            You choose whether to receive requests. Switch it on in your profile and you will see candidates asking for a
            referral at your company, and get an email when someone asks. You can also set how many you want each week.
          </p>
          <Link href="/apps/dwaar/profile" className="dw-btn dw-btn-primary dw-btn-lg mt-6 inline-flex">
            Open my profile
          </Link>
        </section>
      </>
    );
  }

  const [inbox, accepted, companies, earnings] = await Promise.all([listInbox(supabase), listAccepted(supabase), listCompanyOptions(supabase), getMyEarnings(supabase)]);
  const requestIds = [...inbox.map((r) => r.out_id), ...accepted.map((r) => r.out_id)];
  const [extras, matches] = await Promise.all([getCandidateExtras(supabase, requestIds), getCandidateMatches(supabase, requestIds)]);
  const company = companies.find((c) => c.id === profile.provider_company_id)?.name ?? "your company";
  const note = params.answer === "error" ? "Something went wrong. Please try again." : ANSWER_NOTES[params.answer as Answer];

  return (
    <>
      <div className="mt-8 mb-10 flex items-center gap-4">
        <CompanyMonogram name={company} size={56} />
        <div>
          <p className="dw-eyebrow">Employee desk</p>
          <h1 className="dw-title dw-display">{company}</h1>
        </div>
      </div>

      {note && (
        <p
          role={params.answer === "error" ? "alert" : "status"}
          className={`mb-6 dw-alert ${
            params.answer === "error" ? "dw-alert-error" : "dw-alert-info"
          }`}
        >
          {note}
        </p>
      )}

      {earnings && (
        <section className="dw-card mb-8" aria-labelledby="dw-earn">
          <h2 id="dw-earn" className="dw-display text-xl">
            Your credits from referring
          </h2>
          <p className="mt-2 text-3xl font-semibold">{earnings.acceptCredits + earnings.outcomeCredits}</p>
          <p className="dw-muted mt-1 text-sm">
            {earnings.accepted} accepted · {earnings.interviews} interviews · {earnings.offers} offers
          </p>
          <p className="dw-muted mt-3 text-sm">
            You earn {EARN_ACCEPT} credits for each request you accept, {EARN_INTERVIEW} when the candidate reports an interview and{" "}
            {EARN_OFFER} for an offer. Use credits for your own Resume Boosts. Credits are not money and cannot be cashed out.
          </p>
        </section>
      )}

      <h2 className="dw-display text-xl">Waiting for you</h2>
      <p className="mt-2 max-w-2xl dw-muted">
        Candidates asking for a referral at {company}. You see their name, headline, LinkedIn, skills, the job and an AI match score for this job. You do not see their resume. After you accept, you can ask in the chat for their phone number or email.
        If you accept, you can chat with them live in Dwaar and see their resume. Email addresses are never shared.
      </p>

      {inbox.length === 0 ? (
        <section className="dw-card mt-6">
          <p className="dw-muted">No one is waiting right now. New requests appear here.</p>
        </section>
      ) : (
        <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {inbox.map((r) => (
            <li key={r.out_id}>
              <RequestCard
                number={passNumber(r.out_id)}
                tileName={r.out_candidate_name}
                company={r.out_candidate_headline || "Candidate"}
                title={r.out_candidate_name}
                meta={`For ${r.out_job_title}${r.out_job_id ? ` · ${r.out_job_id}` : ""} · asked ${timeAgo(r.out_created_at)}`}
                status="Waiting for you"
                tone="wait"
              >
                <MatchSummary match={matches.get(r.out_id)} />
                <CandidateDetails extras={extras.get(r.out_id)} />
                {r.out_note && <p className="dw-muted mb-3 text-sm italic">&ldquo;{r.out_note}&rdquo;</p>}
                <a href={r.out_job_url} target="_blank" rel="noopener noreferrer" className="dw-link mb-3 inline-block text-sm">
                  View the job posting
                </a>
                <form action={respondToRequestAction} className="flex flex-wrap gap-3">
                  <input type="hidden" name="requestId" value={r.out_id} />
                  <button type="submit" name="decision" value="accept" className="dw-btn dw-btn-primary dw-btn-sm">
                    Accept and refer
                  </button>
                  <button type="submit" name="decision" value="dismiss" className="dw-btn dw-btn-quiet dw-btn-sm">
                    Not for me
                  </button>
                </form>
              </RequestCard>
            </li>
          ))}
        </ul>
      )}

      <h2 className="dw-display mt-14 text-xl">People you accepted</h2>
      {accepted.length === 0 ? (
        <p className="mt-3 max-w-2xl dw-muted">When you accept a request, you can chat with the candidate live and open their resume. Emails are never shared.</p>
      ) : (
        <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {accepted.map((r) => {
            return (
              <li key={r.out_id}>
                <RequestCard
                  number={passNumber(r.out_id)}
                  tileName={r.out_candidate_name}
                  company={r.out_job_title}
                  title={r.out_candidate_name}
                  meta={`Accepted ${timeAgo(r.out_accepted_at)}`}
                  status="Accepted"
                  tone="ok"
                >
                  <MatchSummary match={matches.get(r.out_id)} />
                <CandidateDetails extras={extras.get(r.out_id)} />
                  <p className="mb-3 text-sm">
                    {!r.out_candidate_messaged
                      ? "Waiting for the candidate's message."
                      : r.out_my_replies === 0
                        ? "The candidate wrote to you. Please reply."
                        : "You replied."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/apps/dwaar/requests/${r.out_id}/chat`} className="dw-btn dw-btn-primary dw-btn-sm">
                      Open chat
                    </Link>
                    <a href={r.out_job_url} target="_blank" rel="noopener noreferrer" className="dw-link text-sm">
                      View the job posting
                    </a>
                  </div>
                </RequestCard>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
