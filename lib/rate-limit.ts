// A simple in-memory rate limiter, shared by the API routes. Each route sets its own limits,
// for example "5 per minute and 30 per day" or "3 per 10 minutes", per visitor (IP address).
//
// Note: memory is per server instance. On Vercel each instance keeps its own counts and
// they reset on a cold start, so this stops casual abuse, not a determined attacker.
// For stricter limits later, move the counts to a shared store such as Upstash Redis.

export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

// At most `max` requests in any `windowMs` period. `name` says which limit was hit.
export type Limit = { name: string; max: number; windowMs: number };

export type RateLimitResult = { allowed: true } | { allowed: false; limit: string; retryAfterSeconds: number };

// Limits are checked in the order given, so list the longest window first if its message matters most.
export function createRateLimiter(limits: Limit[]) {
  const longestWindow = Math.max(...limits.map((l) => l.windowMs));
  // For each key, the times of its recent requests (oldest first).
  const hits = new Map<string, number[]>();

  function check(key: string, now = Date.now()): RateLimitResult {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < longestWindow);
    hits.set(key, recent);

    for (const limit of limits) {
      const inWindow = recent.filter((t) => now - t < limit.windowMs);
      if (inWindow.length >= limit.max) {
        return {
          allowed: false,
          limit: limit.name,
          retryAfterSeconds: Math.ceil((inWindow[0] + limit.windowMs - now) / 1000),
        };
      }
    }

    recent.push(now);
    if (hits.size > 10_000) sweep(now); // keep memory small
    return { allowed: true };
  }

  // Forgets visitors with no requests inside the longest window.
  function sweep(now: number) {
    for (const [key, times] of hits) {
      if (times.length === 0 || now - times[times.length - 1] >= longestWindow) hits.delete(key);
    }
  }

  return { check };
}

// The visitor's IP address. Vercel sets x-forwarded-for; the first entry is the visitor.
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
