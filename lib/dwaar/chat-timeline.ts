import { KIND_LABEL, type ContactKind, type ContactStatus } from "@/lib/dwaar/contact";
import type { ChatMessageView } from "@/lib/dwaar/chat";

// The live chat shows messages AND phone/email questions in one list, in the order they happened. This is the pure code
// that merges and words them. The phone number or email itself only ever arrives for the employee, after the candidate shared it.

export type ContactView = { kind: ContactKind; status: ContactStatus; value: string | null; askedAt: string; answeredAt: string | null };

export type TimelineEntry =
  | { type: "message"; key: string; at: string; mine: boolean; body: string }
  | { type: "contact"; key: string; at: string; kind: ContactKind; text: string; value: string | null; canAnswer: boolean };

export function buildTimeline(messages: ChatMessageView[], contacts: ContactView[], isCandidate: boolean, otherName: string): TimelineEntry[] {
  const entries: TimelineEntry[] = messages.map((m) => ({ type: "message", key: `m${m.id}`, at: m.at, mine: m.mine, body: m.body }));

  for (const c of contacts) {
    const label = KIND_LABEL[c.kind];
    entries.push({
      type: "contact",
      key: `c-${c.kind}-asked`,
      at: c.askedAt,
      kind: c.kind,
      text: isCandidate ? `${otherName} asked for your ${label}.` : `You asked ${otherName} for their ${label}.`,
      value: null,
      canAnswer: isCandidate && c.status === "pending",
    });
    if (c.status !== "pending" && c.answeredAt) {
      const shared = c.status === "shared";
      entries.push({
        type: "contact",
        key: `c-${c.kind}-answered`,
        at: c.answeredAt,
        kind: c.kind,
        text: isCandidate
          ? shared ? `You shared your ${label}.` : `You chose not to share your ${label}.`
          : shared ? `${otherName} shared their ${label}.` : `${otherName} chose not to share their ${label}.`,
        value: !isCandidate && shared ? c.value : null,
        canAnswer: false,
      });
    }
  }

  // Oldest first. Messages keep their order; a question comes before its answer.
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Date.parse(a.e.at) - Date.parse(b.e.at) || a.i - b.i)
    .map(({ e }) => e);
}

// Which kinds the employee may still ask: not asked yet.
export function askableKinds(contacts: ContactView[]): ContactKind[] {
  return (["phone", "email"] as ContactKind[]).filter((k) => !contacts.some((c) => c.kind === k));
}
