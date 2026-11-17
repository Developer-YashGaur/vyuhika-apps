import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import ChatForm from "@/components/dwaar/ChatForm";
import { getChat } from "@/lib/dwaar/chat";
import { timeAgo } from "@/lib/dwaar/format";
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
  const backHref = info.out_is_candidate ? "/apps/dwaar/requests" : "/apps/dwaar/inbox";

  const hint = info.out_is_candidate
    ? "You can send one message. Say who you are and why you fit the job. Please do not share emails or phone numbers."
    : "Reply to the candidate. You can send up to 3 replies. Please do not share emails or phone numbers.";

  let waiting: string | null = null;
  if (!info.out_can_send) {
    if (info.out_is_candidate) waiting = messages.length > 0 ? `Your message was sent. ${info.out_other_name} can reply here.` : null;
    else waiting = messages.length === 0 ? `Waiting for ${info.out_other_name} to write first.` : "You have sent all your replies.";
  }

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

      <ul className="mt-8 flex flex-col gap-4" aria-label="Messages">
        {messages.length === 0 && <li className="dw-muted">No messages yet.</li>}
        {messages.map((m) => (
          <li key={m.out_id} className={m.out_mine ? "self-end" : "self-start"}>
            <div className={`dw-card max-w-[34rem] ${m.out_mine ? "dw-panel" : ""}`}>
              <p className="whitespace-pre-wrap break-words">{m.out_body}</p>
              <p className="mt-2 text-xs dw-muted">
                {m.out_mine ? "You" : info.out_other_name}, {timeAgo(m.out_created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {info.out_can_send ? (
          <ChatForm requestId={requestId} hint={hint} />
        ) : (
          waiting && (
            <p role="status" className="dw-alert dw-alert-info">
              {waiting}
            </p>
          )
        )}
      </div>
    </>
  );
}
