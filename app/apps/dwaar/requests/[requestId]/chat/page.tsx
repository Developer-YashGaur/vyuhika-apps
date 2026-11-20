import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import LiveChat from "@/components/dwaar/LiveChat";
import MatchSummary from "@/components/dwaar/MatchSummary";
import { setResumeSharedAction } from "@/app/apps/dwaar/actions";
import { getCandidateMatches } from "@/lib/dwaar/candidate-match";
import { CHAT_NOTICE } from "@/lib/dwaar/chat-monitor";
import CandidateDetails from "@/components/dwaar/CandidateDetails";
import { getCandidateExtras } from "@/lib/dwaar/candidate-extras";
import { getContactViews } from "@/lib/dwaar/contact-views";
import { markChatRead } from "@/lib/dwaar/notifications";
import { getChat, getChatResume, toMessageViews } from "@/lib/dwaar/chat";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ChatPage({ params }: { params: Promise<{ requestId: string }> }) {
  return (
    <div className="dw-wrap dw-page">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="dw-muted">Loading…</p>}>
          <ChatContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function ChatContent({ params }: { params: Promise<{ requestId: string }> }) {
  await connection();
  const { requestId } = await params;
  if (!UUID.test(requestId)) notFound();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/apps/dwaar");

  // The database only returns a chat to the candidate and the employee who accepted.
  const chat = await getChat(supabase, requestId);
  if (!chat) notFound();
  const { info, messages } = chat;
  const [contacts, extras, matches, resume] = await Promise.all([
    getContactViews(supabase, requestId),
    info.out_is_candidate ? Promise.resolve(null) : getCandidateExtras(supabase, [requestId]),
    info.out_is_candidate ? Promise.resolve(null) : getCandidateMatches(supabase, [requestId]),
    getChatResume(supabase, requestId),
  ]);
  await markChatRead(supabase, requestId);
  const backHref = info.out_is_candidate ? "/apps/dwaar/requests" : "/apps/dwaar/inbox";

  return (
    <>
      <Link href={backHref} className="dw-back">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </Link>
      <p className="dw-eyebrow mt-8">{info.out_job_title} at {info.out_company_name}</p>
      <h1 className="dw-title dw-display mt-2">Chat with {info.out_other_name}</h1>
      <p role="note" className="dw-alert dw-alert-info mt-4 text-sm">{CHAT_NOTICE}</p>
      {extras && <div className="mt-4"><CandidateDetails extras={extras.get(requestId)} /></div>}

      {!info.out_is_candidate && (
        <div className="mt-4">
          <MatchSummary match={matches?.get(requestId)} />
          <p className="text-sm">
            {resume?.path ? (
              <a href={`/apps/dwaar/requests/${requestId}/resume`} target="_blank" rel="noopener noreferrer" className="dw-btn dw-btn-quiet">
                View resume<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <span className="dw-muted">
                {resume?.hasResume ? `${info.out_other_name} has not shared their resume with you.` : "There is no resume to show for this request."}
              </span>
            )}
          </p>
        </div>
      )}
      {info.out_is_candidate && resume?.hasResume && (
        <form action={setResumeSharedAction} className="dw-card mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <input type="hidden" name="requestId" value={requestId} />
          <label className="flex items-center gap-3">
            <input type="checkbox" name="shared" defaultChecked={resume.shared} className="h-4 w-4" />
            <span>Let {info.out_other_name} see my resume</span>
          </label>
          <button type="submit" className="dw-btn dw-btn-quiet">
            Save
          </button>
        </form>
      )}

      <div className="mt-8">
        <LiveChat requestId={requestId} otherName={info.out_other_name} isCandidate={info.out_is_candidate} initialMessages={toMessageViews(messages)} initialContacts={contacts} initialCanSend={info.out_can_send} />
      </div>


    </>
  );
}
