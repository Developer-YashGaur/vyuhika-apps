import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import AlertsButton from "@/components/dwaar/AlertsButton";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { chatPreview, listMyChats } from "@/lib/dwaar/my-chats";
import { timeAgo } from "@/lib/dwaar/format";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function ChatsPage() {
  return (
    <div className="dw-wrap dw-page">
      <p className="dw-eyebrow">Chats</p>
      <h1 className="dw-title dw-display mt-2 mb-3">Your chats</h1>
      <p className="mb-8 max-w-2xl text-lg leading-relaxed dw-muted">
        Every employee who accepted your request, and every candidate you accepted, in one place. Open one to chat live.
      </p>
      <div className="mb-6">
        <AlertsButton />
      </div>
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <ChatsContent />
      </Suspense>
    </div>
  );
}

async function ChatsContent() {
  await connection();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const chats = await listMyChats(supabase);
  if (chats.length === 0) {
    return (
      <section className="dw-card">
        <h2 className="dw-display text-xl">No chats yet</h2>
        <p className="dw-muted mt-3">A chat opens when an employee accepts your request, or when you accept a candidate&apos;s request.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/apps/dwaar/requests" className="dw-btn dw-btn-primary">
            My requests
          </Link>
          <Link href="/apps/dwaar/inbox" className="dw-btn dw-btn-quiet">
            Employee desk
          </Link>
        </div>
      </section>
    );
  }

  return (
    <ul className="grid gap-4">
      {chats.map((c) => (
        <li key={c.requestId}>
          <Link href={`/apps/dwaar/requests/${c.requestId}/chat`} className="dw-card block" aria-label={`Open chat with ${c.otherName} about ${c.jobTitle} at ${c.company}`}>
            <p className="flex flex-wrap items-center justify-between gap-2">
              <span className="dw-display text-lg">
                {c.otherName}
                {c.unread > 0 && (
                  <span className="dw-badge" aria-label={`${c.unread} new`}>
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
              </span>
              <span className="dw-muted text-sm">{timeAgo(c.lastAt ?? c.acceptedAt)}</span>
            </p>
            <p className="dw-muted text-sm">
              {c.jobTitle} at {c.company} · {c.isCandidate ? "Employee who accepted you" : "Candidate you accepted"}
            </p>
            <p className={`mt-2 text-sm ${c.unread > 0 ? "font-semibold" : ""}`}>{chatPreview(c)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
