// Plain helpers for the job-search limit note. No server code, so the browser can use them too.

// Keep in step with role_searches_free_daily and role_search_credit_cost in private.dwaar_config (the database decides).
export const ROLE_FREE_DAILY = 5;
export const ROLE_SEARCH_CREDIT_COST = 2;

export type RoleSearchStatus = { used: number; free: number; max: number; cost: number; credits: number };

// The line shown above the button, so people know before they click whether the search is free or uses credits.
export function roleSearchNote(s: RoleSearchStatus): { text: string; canSearch: boolean } {
  if (s.used >= s.max) return { text: "You have reached today's limit of job searches. Please try again tomorrow.", canSearch: false };
  if (s.used < s.free) return { text: `${s.free - s.used} of ${s.free} free job searches left today. After that, each search takes ${s.cost} credits.`, canSearch: true };
  if (s.credits >= s.cost) return { text: `Your ${s.free} free searches today are used. This search will take ${s.cost} credits. You have ${s.credits}.`, canSearch: true };
  return { text: `Your ${s.free} free searches today are used. Each extra search takes ${s.cost} credits and you have ${s.credits}.`, canSearch: false };
}
