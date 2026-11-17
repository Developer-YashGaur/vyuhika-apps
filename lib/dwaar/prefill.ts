import { JOB_DESCRIPTION_LIMITS } from "@/lib/dwaar/request-form";

// "Find openings" hands the chosen opening's description to the request form through this browser tab only
// (sessionStorage). It is never sent anywhere until the person sends the request. It is kept for one opening.

export const PREFILL_KEY = "dwaar-prefill";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function savePrefill(url: string, description: string, s: Store | null = store()): void {
  if (!s) return;
  try {
    s.setItem(PREFILL_KEY, JSON.stringify({ url, description: description.slice(0, JOB_DESCRIPTION_LIMITS.max) }));
  } catch {
    // Storage can be full or blocked. The person can still paste the description themselves.
  }
}

// Returns the saved description only when it belongs to this link. It is used once.
export function readPrefill(url: string | undefined, s: Store | null = store()): string {
  if (!s || !url) return "";
  try {
    const raw = s.getItem(PREFILL_KEY);
    if (!raw) return "";
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return "";
    const { url: savedUrl, description } = data as { url?: unknown; description?: unknown };
    if (savedUrl !== url || typeof description !== "string") return "";
    s.removeItem(PREFILL_KEY);
    return description.slice(0, JOB_DESCRIPTION_LIMITS.max);
  } catch {
    return "";
  }
}
