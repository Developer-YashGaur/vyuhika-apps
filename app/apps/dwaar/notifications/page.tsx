import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { dwaarMetadata } from "@/lib/dwaar/metadata";
import { timeAgo } from "@/lib/dwaar/format";
import { listMyChats } from "@/lib/dwaar/my-chats";
import { getNotificationCounts } from "@/lib/dwaar/notifications";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = dwaarMetadata;

export default function NotificationsPage() {
  return (
    <div className="dw-wrap dw-page">
      <p className="dw-eyebrow">Notifications</p>
      <h1 className="dw-title dw-display mt-2 mb-3">What needs you</h1>
      <p className="mb-8 max-w-2xl text-lg leading-relaxed dw-muted">New chat messages and requests waiting for your reply, in one place.</p>
      <Suspense fallback={<p className="dw-muted">Loading…</p>}>
        <NotificationsContent />
      </Suspense>
    </div>
  );
}

async function NotificationsContent() {
  await connection();
  if (!supabaseConfigured()) redirect("/apps/dwaar?error=setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/apps/dwaar");

  const [counts, chats] = await Promise.all([getNotificationCounts(supabase), listMyChats(supabase)]);
  const unreadChats = chats.filter((c) => c.unread > 0);
  const waiting = counts?.waitingRequests ?? 0;

  if (unreadChats.length === 0 && waiting === 0) {
    return (
      <section className="dw-card">
        <h2 className="dw-display text-xl">You are all caught up</h2>
        <p className="dw-muted mt-3">Nothing is waiting for you right now. New messages and requests will show up here.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/apps/dwaar/jobs" className="dw-btn dw-btn-primary">
            See latest jobs
          </Link>
          <Link href="/apps/dwaar/requests" className="dw-btn dw-btn-quiet">
            My requests
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {waiting > 0 && (
        <Link href="/apps/dwaar/inbox" className="dw-card block">
          <p className="dw-display text-lg">
            {waiting} {waiting === 1 ? "candidate is" : "candidates are"} waiting for your reply
          </p>
          <p className="dw-muted text-sm">Open the Employee desk to accept or decline.</p>
        </Link>
      )}
      {unreadChats.map((c) => (
        <Link key={c.requestId} href={`/apps/dwaar/requests/${c.requestId}/chat`} className="dw-card block">
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="dw-display text-lg">
              {c.otherName} sent {c.unread} new {c.unread === 1 ? "item" : "items"}
            </span>
            <span className="dw-muted text-sm">{timeAgo(c.lastAt ?? c.acceptedAt)}</span>
          </p>
          <p className="dw-muted text-sm">
            {c.jobTitle} at {c.company}
          </p>
        </Link>
      ))}
    </div>
  );
}
