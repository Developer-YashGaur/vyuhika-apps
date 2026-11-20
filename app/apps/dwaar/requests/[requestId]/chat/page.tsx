import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import LiveChat from "@/components/dwaar/LiveChat";
import MatchSummary from "@/components/dwaar/MatchSummary";
import { closeChatAction, setResumeSharedAction } from "@/app/apps/dwaar/actions";
import { getCandidateMatches } from "@/lib/dwaar/candidate-match";
import { CHAT_NOTICE } from "@/lib/dwaar/chat-monitor";
import CandidateDetails from "@/components/dwaar/CandidateDetails";
import { getCandidateExtras } from "@/lib/dwaar/candidate-extras";
import { getContactViews } from "@/lib/dwaar/contact-views";
import { markChatRead } from "@/lib/dwaar/notifications";
import { getChat, getChatResume, listClosedChatIds, toMessageViews } from "@/lib/dwaar/chat";
import { chatPreview, listMyChats } from "@/lib/dwaar/my-chats";
import { timeAgo } from "@/lib/dwaar/format";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ChatPage({ params }: { params: Promise<{ requestId: string }> }) {
  return (
    // A full-height chat screen: only the message list scrolls, the page itself stays still (see .dw-chatpage in dwaar.css).
    <div className="dw-chatpage">
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <ChatContent params={params} />
      </Suspense>
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
  const { info, messages, closed } = chat;
  const [contacts, extras, matches, resume, allChats, closedIds] = await Promise.all([
    getContactViews(supabase, requestId),
    info.out_is_candidate ? Promise.resolve(null) : getCandidateExtras(supabase, [requestId]),
    info.out_is_candidate ? Promise.resolve(null) : getCandidateMatches(supabase, [requestId]),
    getChatResume(supabase, requestId),
    listMyChats(supabase),
    listClosedChatIds(supabase),
  ]);
  await markChatRead(supabase, requestId);
  const backHref = info.out_is_candidate ? "/apps/dwaar/requests" : "/apps/dwaar/inbox";

  return (
    <>
      {/* Left: everyone I chat with (wide screens only; phones use the Back link). Right: the open chat. */}
      <aside className="dw-chatlist" aria-label="Your chats">
        <p className="dw-chatlist-title">Chats</p>
        <ul>
          {allChats.map((c) => (
            <li key={c.requestId}>
              <Link href={`/apps/dwaar/requests/${c.requestId}/chat`} className="dw-chatlist-item" aria-current={c.requestId === requestId ? "page" : undefined}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.otherName}</span>
                  <span className="dw-muted shrink-0 text-xs">{timeAgo(c.lastAt ?? c.acceptedAt)}</span>
                </span>
                <span className="dw-muted block truncate text-xs">
                  {c.jobTitle} at {c.company}
                  {closedIds.has(c.requestId) ? " · Closed" : ""}
                </span>
                <span className={`block truncate text-sm ${c.unread > 0 ? "font-semibold" : "dw-muted"}`}>
                  {chatPreview(c)}
                  {c.unread > 0 && c.requestId !== requestId && (
                    <span className="dw-badge" aria-label={`${c.unread} new`}>
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <section className="dw-chatmain">
      <Link href={backHref} className="dw-back">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </Link>
      <p className="dw-eyebrow">{info.out_job_title} at {info.out_company_name}</p>
      <h1 className="dw-display text-xl leading-tight sm:text-2xl">Chat with {info.out_other_name}</h1>
      <details className="dw-card dw-chat-details">
        <summary className="cursor-pointer text-sm font-medium">Details, resume and rules</summary>
        <div className="mt-3 flex flex-col gap-3">
          <p role="note" className="dw-alert dw-alert-info text-sm">{CHAT_NOTICE}</p>
      {extras && <div><CandidateDetails extras={extras.get(requestId)} /></div>}

      {!info.out_is_candidate && (
        <div>
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
        <form action={setResumeSharedAction} className="flex flex-wrap items-center justify-between gap-3 text-sm">
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

      {!info.out_is_candidate && !closed && (
        <form action={closeChatAction} className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <input type="hidden" name="requestId" value={requestId} />
          <span>Finished helping? Closing the chat stops new messages. You both can still read it, and it cannot be re-opened.</span>
          <button type="submit" className="dw-btn dw-btn-quiet">
            Close this chat
          </button>
        </form>
      )}
        </div>
      </details>

      <div className="flex min-h-0 flex-1 flex-col">
        <LiveChat key={requestId} requestId={requestId} otherName={info.out_other_name} isCandidate={info.out_is_candidate} initialMessages={toMessageViews(messages)} initialContacts={contacts} initialCanSend={info.out_can_send} initialClosed={closed} />
      </div>
      </section>
    </>
  );
}
