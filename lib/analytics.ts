import { track } from "@vercel/analytics";
import { apps, isExternal } from "@/lib/apps";
import { FEEDBACK_TYPES } from "@/lib/feedback/rules";

// The only door to Vercel's custom events. It is built so that nothing a visitor typed or uploaded can leave:
// - There is a FIXED list of event names. An unknown name is refused.
// - Each event has a FIXED list of properties, and each property a FIXED list of allowed values (fixed words).
//   Anything else (another property, a value that isn't on the list, a number, a sentence, a URL, a file name,
//   an email address, text from a resume, job, letter, company, role or highlight) is dropped before sending.
// - It never throws, and it does nothing in development, in tests and on the server.
// Custom events need Vercel's Pro plan; on the free Hobby plan they are simply not shown (page views still are).

// Where a visitor was when they sent feedback, as a fixed word (never the address itself).
const FEEDBACK_PAGES = ["home", "resume-matcher", "cover-letter-writer", "other"] as const;

// Keep these two lists in step with lib/cover-letter/schema.ts (tests/analytics.test.ts checks that they are).
const TONES = ["professional", "friendly", "confident"] as const;
const LENGTHS = ["short", "medium"] as const;

const EVENTS = {
  resume_analyzed: { app: ["resume-matcher"] },
  cover_letter_written: { app: ["cover-letter-writer"], tone: TONES, length: LENGTHS },
  feedback_sent: { type: FEEDBACK_TYPES.map((t) => t.value), page: FEEDBACK_PAGES },
  external_app_clicked: { app: apps.filter(isExternal).map((app) => app.slug) },
  resume_file_selected: { file_type: ["pdf", "docx", "txt"] },
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type EventName = keyof typeof EVENTS;
export const EVENT_NAMES = Object.keys(EVENTS) as EventName[];

// The properties each event may carry, with their allowed values.
export type EventProperties<N extends EventName> = { [K in keyof (typeof EVENTS)[N]]?: (typeof EVENTS)[N][K] extends readonly (infer V)[] ? V : never };

// The fixed word for a page address: "home", an app's slug, or "other". Never the address itself.
export function pageName(pathname: string): (typeof FEEDBACK_PAGES)[number] {
  if (pathname === "/") return "home";
  if (pathname === "/apps/resume-matcher") return "resume-matcher";
  if (pathname === "/apps/cover-letter-writer") return "cover-letter-writer";
  return "other";
}

// What would be sent: the event name and only the properties whose name and value are on the lists.
// Returns null for an unknown event name. Pure, so tests can check exactly what gets through.
export function cleanEvent(name: unknown, properties?: unknown): { name: EventName; properties: Record<string, string> } | null {
  if (typeof name !== "string" || !Object.hasOwn(EVENTS, name)) return null;
  const allowed = EVENTS[name as EventName] as Record<string, readonly string[]>;

  const clean: Record<string, string> = {};
  if (typeof properties === "object" && properties !== null && !Array.isArray(properties)) {
    for (const [key, value] of Object.entries(properties)) {
      if (Object.hasOwn(allowed, key) && typeof value === "string" && allowed[key].includes(value)) clean[key] = value;
    }
  }
  return { name: name as EventName, properties: clean };
}

// Sends one custom event. Safe to call anywhere: it checks everything and never throws.
export function trackEvent<N extends EventName>(name: N, properties?: EventProperties<N>): void {
  try {
    if (process.env.NODE_ENV !== "production" || typeof window === "undefined") return;
    const event = cleanEvent(name, properties);
    if (event) track(event.name, event.properties);
  } catch {
    // Counting visitors must never break the page.
  }
}
