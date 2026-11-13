// A simple in-memory rate limiter: at most `perMinute` requests per minute and
// `perDay` requests per 24 hours for each visitor (by IP address).
//
// Note: memory is per server instance. On Vercel each instance keeps its own counts and
// they reset on a cold start, so this stops casual abuse, not a determined attacker.
// For stricter limits later, move the counts to a shared store such as Upstash Redis.

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "minute" | "day"; retryAfterSeconds: number };

export function createRateLimiter({ perMinute, perDay }: { perMinute: number; perDay: number }) {
  // For each key, the times of its requests in the last 24 hours (oldest first).
  const hits = new Map<string, number[]>();

  function check(key: string, now = Date.now()): RateLimitResult {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < DAY_MS);
    const lastMinute = recent.filter((t) => now - t < MINUTE_MS);

    if (recent.length >= perDay) {
      hits.set(key, recent);
      return { allowed: false, reason: "day", retryAfterSeconds: Math.ceil((recent[0] + DAY_MS - now) / 1000) };
    }
    if (lastMinute.length >= perMinute) {
      hits.set(key, recent);
      return {
        allowed: false,
        reason: "minute",
        retryAfterSeconds: Math.ceil((lastMinute[0] + MINUTE_MS - now) / 1000),
      };
    }

    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) sweep(now); // keep memory small
    return { allowed: true };
  }

  // Forgets visitors with no requests in the last 24 hours.
  function sweep(now: number) {
    for (const [key, times] of hits) {
      if (now - times[times.length - 1] >= DAY_MS) hits.delete(key);
    }
  }

  return { check };
}

// The visitor's IP address. Vercel sets x-forwarded-for; the first entry is the visitor.
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
