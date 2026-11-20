import Link from "next/link";
import { redirect } from "next/navigation";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { cancelRequestAction } from "@/app/apps/dwaar/actions";
import BoostButton from "@/components/dwaar/BoostButton";
import CreditBoostButton from "@/components/dwaar/CreditBoostButton";
import BoostForm from "@/components/dwaar/BoostForm";
import OutcomeButtons from "@/components/dwaar/OutcomeButtons";
import RequestCard from "@/components/dwaar/RequestCard";
import { listClosedChatIds } from "@/lib/dwaar/chat";
import { getOutcome, type Outcome } from "@/lib/dwaar/earnings";
import ScoreCard from "@/components/dwaar/ScoreCard";
import { listMyBoosts, type MyBoost } from "@/lib/dwaar/boost";
import { listBoostScores } from "@/lib/dwaar/boost-resume";
import { boostPaymentsEnabled, inviteRewardsEnabled } from "@/lib/dwaar/features";
import { BOOST_CREDIT_COST, getCreditBalance } from "@/lib/dwaar/credit-boost";
import { notifyProviders } from "@/lib/dwaar/notify";
import { serverSecret } from "@/lib/dwaar/work-email";
import { getEmailSettings } from "@/lib/email/settings";
import { createResendSender } from "@/lib/feedback/deliver";
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
    <div className="dw-wrap dw-page">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="dw-eyebrow">My requests</p>
          <h1 className="dw-title dw-display mt-2">Your referral requests</h1>
        </div>
        <Link href="/apps/dwaar/requests/new" className="dw-btn dw-btn-primary dw-btn-lg">
          Ask for a referral
        </Link>
      </div>
      <div className="mt-8">
        <Suspense fallback={<p className="dw-muted">Loading…</p>}>
          <RequestsContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function RequestsContent({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");
  // Everything is asked at the same time (one trip, not five). If there is no profile we send the person to make one.
  const [profile, requests, analyses, boosts, boostScores, closedChats] = await Promise.all([
    getMyProfile(supabase, data.user.id),
    listMyRequests(supabase),
    listMyAnalyses(supabase),
    listMyBoosts(supabase),
    listBoostScores(supabase),
    listClosedChatIds(supabase),
  ]);
  if (!profile) redirect("/apps/dwaar/profile");
  // If a request has waited 24 hours with no answer, the database hands it to the next 5 employees. It decides when
  // (this does nothing earlier), so asking on every visit is safe. It runs after the page is sent.
  const secret = serverSecret();
  const settings = getEmailSettings();
  const send = createResendSender();
  const waiting = requests.filter((r) => r.out_status === "open").map((r) => r.out_id);
  if (secret && settings && send && waiting.length > 0) {
    after(async () => {
      for (const id of waiting) await notifyProviders(supabase, { secret, send, settings }, id, "next");
    });
  }
  const analysisById = new Map(analyses.map((a) => [a.requestId, a]));
  // What the candidate already said about each accepted request (a few small reads).
  const acceptedIds = requests.filter((r) => r.out_status === "accepted").map((r) => r.out_id);
  const outcomes = new Map<string, Outcome>(await Promise.all(acceptedIds.map(async (id) => [id, await getOutcome(supabase, id)] as const)));
  const boostOn = boostPaymentsEnabled();
  const credits = inviteRewardsEnabled() ? await getCreditBalance(supabase) : 0;
  const checkNote: Record<string, string> = {
    done: " Your resume match score is on the card below.",
    limit: " You have used all of today's resume checks, so there is no score this time.",
    failed: " We could not check your resume right now.",
  };
  const info = params.sent
    ? `Your request was sent. Employees at that company can now see it.${checkNote[params.check ?? ""] ?? ""}`
    : params.cancelled
      ? "Your request was cancelled."
      : null;

  return (
    <>
      {info && (
        <p role="status" className="dw-alert dw-alert-info mb-6">
          {info}
        </p>
      )}

      {requests.length === 0 ? (
        <section className="dw-card">
          <h2 className="dw-display text-xl">No requests yet</h2>
          <p className="dw-muted mt-3">
            When you ask for a referral, it appears here, and you can follow it from &ldquo;Waiting for an employee&rdquo; to an
            answer.
          </p>
          <Link href="/apps/dwaar/requests/new" className="dw-btn dw-btn-primary dw-btn-lg mt-6">
            Ask for a referral
          </Link>
        </section>
      ) : (
        <ul className="dw-rows">
          {requests.map((r) => (
            <li key={r.out_id}>
              <RequestItem request={r} analysis={analysisById.get(r.out_id)} boost={boosts.get(r.out_id)} boostScore={boostScores.get(r.out_id) ?? null} boostOn={boostOn} credits={credits} outcome={outcomes.get(r.out_id) ?? ""} chatClosed={closedChats.has(r.out_id)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RequestItem({ request: r, analysis, boost, boostScore, boostOn, credits, outcome, chatClosed }: { request: MyRequest; analysis?: Analysis; boost?: MyBoost; boostScore: number | null; boostOn: boolean; credits: number; outcome: Outcome; chatClosed: boolean }) {
  const stamp = statusStamp(r.out_status);
  return (
    <RequestCard
      number={passNumber(r.out_id)}
      company={r.out_company_name}
      title={r.out_job_title}
      meta={`Asked ${timeAgo(r.out_created_at)}`}
      status={stamp.label}
      tone={stamp.tone}
    >
      {analysis && <ScoreCard analysis={analysis} />}
      {analysis?.score != null && boost?.status === "delivered" && (
        <p className="dw-alert dw-alert-good text-sm">
          <strong>{boostScore !== null ? `After your Boost: ${boostScore} out of 100` : "Your Boost is ready."}</strong> (was {analysis.score}).{" "}
          <Link href={`/apps/dwaar/requests/${r.out_id}/boost`} className="dw-link">
            {boostScore !== null ? "See your improved resume" : "Open it and check the new score"}
          </Link>
        </p>
      )}
      {r.out_note && <p className="dw-muted text-sm italic">&ldquo;{r.out_note}&rdquo;</p>}
      {r.out_status === "accepted" && (
        <p className="text-sm">
          <strong>{r.out_accepted_by_name}</strong> accepted your request. {chatClosed ? "They closed the chat; you can still read it." : "You can chat with them live."}{" "}
          <Link href={`/apps/dwaar/requests/${r.out_id}/chat`} className="dw-link">
            {chatClosed ? "Read chat" : "Open chat"}
          </Link>
        </p>
      )}
      {r.out_status === "accepted" && <OutcomeButtons requestId={r.out_id} initial={outcome} />}
      {boost?.status === "delivered" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <strong>Your Boost is ready</strong>
            {boost.count > 1 ? ` (Boost ${boost.count})` : ""}.{" "}
            <Link href={`/apps/dwaar/requests/${r.out_id}/boost`} className="dw-link">
              Open it
            </Link>
          </p>
          {r.out_status !== "cancelled" && boost.count < 5 && credits >= BOOST_CREDIT_COST && (
            <div className="dw-boost-box">
              <p className="text-sm">Want a better score? You can Boost again with credits.{r.out_status === "open" ? " Until an employee accepts, you can put the new resume on this request." : ""}</p>
              <CreditBoostButton requestId={r.out_id} credits={credits} />
            </div>
          )}
        </div>
      ) : boost?.status === "paid" ? (
        <BoostForm orderId={boost.orderId} />
      ) : (
        r.out_has_resume && (
          <div className="dw-boost-box">
            <p className="text-sm">
              <strong>Resume Boost.</strong> We rewrite your resume for this job, show the new score, and let you swap it onto this request.
            </p>
            {credits >= BOOST_CREDIT_COST && <CreditBoostButton requestId={r.out_id} credits={credits} />}
            {boostOn && <BoostButton requestId={r.out_id} />}
            {!boostOn && credits < BOOST_CREDIT_COST && <p className="dw-muted text-sm">Boost opens soon. It will appear here as a button.</p>}
          </div>
        )
      )}
      <div className="flex flex-wrap items-center gap-3">
        <a href={r.out_job_url} target="_blank" rel="noopener noreferrer" className="dw-link text-sm">
          View the job posting
        </a>
        {r.out_status === "open" && (
          <form action={cancelRequestAction} className="ml-auto">
            <input type="hidden" name="requestId" value={r.out_id} />
            <button type="submit" className="dw-btn dw-btn-quiet dw-btn-sm">
              Cancel request
            </button>
          </form>
        )}
      </div>
    </RequestCard>
  );
}
