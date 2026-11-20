import "server-only";
import { timingSafeEqual } from "node:crypto";
import { jobsFeedEnabled } from "@/lib/dwaar/features";
import { refreshJobsFeed } from "@/lib/dwaar/jobs";

// Vercel calls this twice a day (see vercel.json). It sends "Authorization: Bearer <CRON_SECRET>".
// Anyone else gets 401, so nobody can use it to burn the job source's quota.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const given = request.headers.get("authorization") ?? "";
  if (!expected) return Response.json({ error: "not set up" }, { status: 503 });
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${expected}`);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "unauthorized" }, { status: 401 });

  if (!jobsFeedEnabled()) return Response.json({ ok: true, skipped: "jobs feed is switched off" });

  const outcome = await refreshJobsFeed();
  if (!outcome.ok) return Response.json({ ok: false, reason: outcome.reason }, { status: 502 });
  return Response.json({ ok: true, fetched: outcome.fetched, stored: outcome.stored });
}
