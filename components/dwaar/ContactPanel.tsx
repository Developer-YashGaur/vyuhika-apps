"use client";

import { useState, useTransition } from "react";
import { answerContactAction, askContactAction } from "@/app/apps/dwaar/actions";
import { CONTACT_KINDS, KIND_LABEL, type ContactItem, type ContactKind } from "@/lib/dwaar/contact";

// Phone and email requests in the chat. The employee asks with a button; the candidate chooses Share or Decline.
// The phone number or email only appears for the employee, and only after the candidate shared it.

type Props = { requestId: string; isCandidate: boolean; otherName: string; items: ContactItem[] };

export default function ContactPanel({ requestId, isCandidate, otherName, items }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const byKind = (kind: ContactKind) => items.find((i) => i.kind === kind);

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        setMessage({ ok: result.ok, text: result.message });
      } catch {
        setMessage({ ok: false, text: "Something went wrong. Please try again in a moment." });
      }
    });
  }

  const visible = isCandidate ? items : CONTACT_KINDS.map((k) => byKind(k) ?? { kind: k, status: null, value: null });

  return (
    <section className="dw-card mt-8 flex flex-col gap-4" aria-labelledby="contact-title">
      <div>
        <h2 id="contact-title" className="dw-display text-lg">Phone and email</h2>
        <p className="dw-muted mt-1 text-sm">
          {isCandidate
            ? `Contact details stay private. ${otherName} can ask for them here, and you choose whether to share.`
            : `Contact details stay private. Ask here, and ${otherName} chooses whether to share.`}
        </p>
      </div>

      {isCandidate && items.length === 0 && <p className="dw-muted text-sm">No one has asked for your contact details.</p>}

      <ul className="flex flex-col gap-3">
        {visible.map((item) => {
          const label = KIND_LABEL[item.kind];
          return (
            <li key={item.kind} className="dw-card-inner flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium capitalize">{label}</p>
                {item.status === "shared" && !isCandidate && item.value && (
                  <p className="mt-1 break-all text-sm">
                    {item.kind === "email" ? (
                      <a href={`mailto:${item.value}`} className="dw-link">{item.value}</a>
                    ) : (
                      <a href={`tel:${item.value}`} className="dw-link">{item.value}</a>
                    )}
                  </p>
                )}
                {item.status === "shared" && isCandidate && <p className="dw-ok-text mt-1 text-sm">You shared it.</p>}
                {item.status === "pending" && (
                  <p className="dw-muted mt-1 text-sm">{isCandidate ? `${otherName} asked for your ${label}.` : `Waiting for ${otherName} to answer.`}</p>
                )}
                {item.status === "declined" && (
                  <p className="dw-muted mt-1 text-sm">{isCandidate ? "You declined." : `${otherName} chose not to share.`}</p>
                )}
                {item.status === null && <p className="dw-muted mt-1 text-sm">Not asked yet.</p>}
              </div>

              {!isCandidate && item.status === null && (
                <button type="button" disabled={pending} onClick={() => run(() => askContactAction(requestId, item.kind))} className="dw-btn dw-btn-quiet dw-btn-sm">
                  Ask for {label}
                </button>
              )}
              {isCandidate && item.status === "pending" && (
                <div className="flex gap-2">
                  <button type="button" disabled={pending} onClick={() => run(() => answerContactAction(requestId, item.kind, true))} className="dw-btn dw-btn-primary dw-btn-sm">
                    Share
                  </button>
                  <button type="button" disabled={pending} onClick={() => run(() => answerContactAction(requestId, item.kind, false))} className="dw-btn dw-btn-quiet dw-btn-sm">
                    Decline
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p role="status" className={message ? (message.ok ? "dw-ok-text text-sm" : "dw-bad-text text-sm") : "sr-only"}>
        {message?.text}
      </p>
    </section>
  );
}
