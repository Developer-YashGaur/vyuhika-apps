import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { respondToRequestAction } from "@/app/apps/dwaar/actions";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CompanyMonogram from "@/components/dwaar/CompanyMonogram";
import VisitorPass from "@/components/dwaar/VisitorPass";
import { timeAgo } from "@/lib/dwaar/format";
import { ANSWER_NOTES, listAccepted, listInbox, mailtoLink, type Answer } from "@/lib/dwaar/inbox";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { passNumber } from "@/lib/dwaar/monogram";
import { getMyProfile, listCompanyOptions } from "@/lib/dwaar/profile";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

type Params = { answer?: string };

export default function InboxPage({ searchParams }: { searchParams: Promise<Params> }) {
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
        <Suspense fallback={<p className="mt-8 text-mist">Loading…</p>}>
          <InboxContent searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
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
        <h1 className="page-title font-display mt-8 mb-10">Reception</h1>
        <section className="dw-paper max-w-2xl">
          <h2 className="font-display text-xl font-medium">This desk is for confirmed employees</h2>
          <p className="dw-muted mt-3 leading-relaxed">
            {profile.is_provider
              ? "Confirm your work email on the Dwaar front page first. Then candidates asking for a referral at your company appear here."
              : "To answer referral requests, turn on \"I can refer people\" in your profile, choose your company and confirm your work email."}
          </p>
          <Link href={profile.is_provider ? "/apps/dwaar" : "/apps/dwaar/profile"} className="btn-glow btn-lg mt-6 inline-flex">
            {profile.is_provider ? "Go to Dwaar" : "Edit my profile"}
          </Link>
        </section>
      </>
    );
  }

  const [inbox, accepted, companies] = await Promise.all([listInbox(supabase), listAccepted(supabase), listCompanyOptions(supabase)]);
  const company = companies.find((c) => c.id === profile.provider_company_id)?.name ?? "your company";
  const note = params.answer === "error" ? "Something went wrong. Please try again." : ANSWER_NOTES[params.answer as Answer];

  return (
    <>
      <div className="mt-8 mb-10 flex items-center gap-4">
        <CompanyMonogram name={company} size={56} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Reception desk</p>
          <h1 className="page-title font-display">{company}</h1>
        </div>
      </div>

      {note && (
        <p
          role={params.answer === "error" ? "alert" : "status"}
          className={`mb-6 max-w-2xl rounded-xl border px-4 py-3 text-sm ${
            params.answer === "error" ? "border-rose-300/40 bg-rose-500/10 text-rose-100" : "border-cyan-300/40 bg-cyan-500/10 text-cyan-50"
          }`}
        >
          {note}
        </p>
      )}

      <h2 className="font-display text-xl font-medium tracking-[-0.03em]">Waiting at your reception</h2>
      <p className="mt-2 max-w-2xl text-mist">
        Candidates asking for a referral at {company}. You see their name, headline and the job. You do not see their resume.
        Their email is shared with you only if you accept.
      </p>

      {inbox.length === 0 ? (
        <section className="dw-paper mt-6 max-w-2xl">
          <p className="dw-muted">No one is waiting right now. New requests appear here.</p>
        </section>
      ) : (
        <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {inbox.map((r) => (
            <li key={r.out_id}>
              <VisitorPass
                number={passNumber(r.out_id)}
                tileName={r.out_candidate_name}
                company={r.out_candidate_headline || "Candidate"}
                title={r.out_candidate_name}
                meta={`For ${r.out_job_title}${r.out_job_id ? ` · ${r.out_job_id}` : ""} · asked ${timeAgo(r.out_created_at)}`}
                stamp="Visitor waiting"
                stampTone="wait"
              >
                {r.out_note && <p className="dw-muted mb-3 text-sm italic">&ldquo;{r.out_note}&rdquo;</p>}
                <a href={r.out_job_url} target="_blank" rel="noopener noreferrer" className="dw-link mb-3 inline-block text-sm">
                  View the job posting
                </a>
                <form action={respondToRequestAction} className="flex flex-wrap gap-3">
                  <input type="hidden" name="requestId" value={r.out_id} />
                  <button type="submit" name="decision" value="accept" className="btn-glow btn-sm">
                    Accept and refer
                  </button>
                  <button type="submit" name="decision" value="dismiss" className="btn-ghost btn-sm">
                    Not for me
                  </button>
                </form>
              </VisitorPass>
            </li>
          ))}
        </ul>
      )}

      <h2 className="font-display mt-16 text-xl font-medium tracking-[-0.03em]">People you accepted</h2>
      {accepted.length === 0 ? (
        <p className="mt-3 max-w-2xl text-mist">When you accept a request, the candidate&apos;s email appears here so you can get in touch.</p>
      ) : (
        <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {accepted.map((r) => {
            const mail = mailtoLink(r.out_candidate_email, r.out_job_title, r.out_company_name);
            return (
              <li key={r.out_id}>
                <VisitorPass
                  number={passNumber(r.out_id)}
                  tileName={r.out_candidate_name}
                  company={r.out_job_title}
                  title={r.out_candidate_name}
                  meta={`Accepted ${timeAgo(r.out_accepted_at)}`}
                  stamp="Accepted"
                  stampTone="ok"
                >
                  <p className="mb-3 text-sm">
                    Email: <strong className="break-all">{r.out_candidate_email}</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {mail && (
                      <a href={mail} className="btn-glow btn-sm">
                        Write to {r.out_candidate_name.split(" ")[0]}
                      </a>
                    )}
                    <a href={r.out_job_url} target="_blank" rel="noopener noreferrer" className="dw-link text-sm">
                      View the job posting
                    </a>
                  </div>
                </VisitorPass>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
