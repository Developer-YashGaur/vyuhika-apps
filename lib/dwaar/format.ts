// Small text helpers for request screens. Pure code.

export type RequestStatus = "open" | "accepted" | "cancelled" | "expired";

export const STATUS_STAMP: Record<RequestStatus, { label: string; tone: "wait" | "ok" | "closed" }> = {
  open: { label: "Waiting for an employee", tone: "wait" },
  accepted: { label: "Accepted", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "closed" },
  expired: { label: "Expired", tone: "closed" },
};

export function statusStamp(status: string): { label: string; tone: "wait" | "ok" | "closed" } {
  return STATUS_STAMP[status as RequestStatus] ?? STATUS_STAMP.expired;
}

// "today", "yesterday", "3 days ago", "2 weeks ago".
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}
