import Link from "next/link";
import { redirect } from "next/navigation";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { cancelRequestAction } from "@/app/apps/dwaar/actions";
import BoostButton from "@/components/dwaar/BoostButton";
import BoostForm from "@/components/dwaar/BoostForm";
import RequestCard from "@/components/dwaar/RequestCard";
import ScoreCard from "@/components/dwaar/ScoreCard";
import { listMyBoosts, type MyBoost } from "@/lib/dwaar/boost";
import { boostPaymentsEnabled } from "@/lib/dwaar/features";
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
  const profile = await getMyProfile(supabase, data.user.id);
  if (!profile) redirect("/apps/dwaar/profile");

  const [requests, analyses, boosts] = await Promise.all([listMyRequests(supabase), listMyAnalyses(supabase), listMyBoosts(supabase)]);
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
  const boostOn = boostPaymentsEnabled();
  const checkNote: Record<string, string> = {
    done: " Your resume match score is on the card below.",
    limit: " You have used today's 5 resume checks, so there is no score this time.",
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
        <p role="status" className="dw-alert dw-alert-info mb-6 max-w-2xl">
          {info}
        </p>
      )}

      {requests.length === 0 ? (
        <section className="dw-card max-w-2xl">
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
        <ul className="dw-grid">
          {requests.map((r) => (
            <li key={r.out_id}>
              <RequestItem request={r} analysis={analysisById.get(r.out_id)} boost={boosts.get(r.out_id)} boostOn={boostOn} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RequestItem({ request: r, analysis, boost, boostOn }: { request: MyRequest; analysis?: Analysis; boost?: MyBoost; boostOn: boolean }) {
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
      {r.out_note && <p className="dw-muted text-sm italic">&ldquo;{r.out_note}&rdquo;</p>}
      {r.out_status === "accepted" && (
        <p className="text-sm">
          <strong>{r.out_accepted_by_name}</strong> accepted your request. You can send them one message.{" "}
          <Link href={`/apps/dwaar/requests/${r.out_id}/chat`} className="dw-link">
            Open chat
          </Link>
        </p>
      )}
      {boost?.status === "delivered" ? (
        <p className="text-sm">
          <strong>Your Boost is ready.</strong>{" "}
          <Link href={`/apps/dwaar/requests/${r.out_id}/boost`} className="dw-link">
            Open it
          </Link>
        </p>
      ) : boost?.status === "paid" ? (
        <BoostForm orderId={boost.orderId} />
      ) : (
        boostOn && r.out_has_resume && <BoostButton requestId={r.out_id} />
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
