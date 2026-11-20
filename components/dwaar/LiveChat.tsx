"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { answerContactAction, askContactAction, loadChatAction, sendMessageAction, type ChatFormState } from "@/app/apps/dwaar/actions";
import { MESSAGE_MAX, type ChatMessageView } from "@/lib/dwaar/chat";
import { askableKinds, buildTimeline, type ContactView } from "@/lib/dwaar/chat-timeline";
import { KIND_LABEL, type ContactKind } from "@/lib/dwaar/contact";

// The live chat: messages, phone/email questions and answers appear by themselves in one list (the page asks for new
// ones every few seconds while it is open and visible), and Enter sends. Nothing is emailed for chat messages.

const POLL_MS = 3000;
const initialState: ChatFormState = { message: null, sent: false };

function clock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type Props = {
  requestId: string;
  otherName: string;
  isCandidate: boolean;
  initialMessages: ChatMessageView[];
  initialContacts: ContactView[];
  initialCanSend: boolean;
};

export default function LiveChat({ requestId, otherName, isCandidate, initialMessages, initialContacts, initialCanSend }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [contacts, setContacts] = useState(initialContacts);
  const [canSend, setCanSend] = useState(initialCanSend);
  const [text, setText] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: ChatFormState, formData: FormData) => {
    const next = await sendMessageAction(requestId, prev, formData);
    if (next.messages) setMessages(next.messages);
    return next;
  }, initialState);
  const list = useRef<HTMLUListElement>(null);
  const count = useRef(-1);

  async function refresh() {
    const result = await loadChatAction(requestId);
    if (result) {
      setMessages((old) => (result.messages.length === old.length && result.messages.at(-1)?.id === old.at(-1)?.id ? old : result.messages));
      setContacts(result.contacts);
      setCanSend(result.canSend);
    }
  }

  // Ask for new items every few seconds, but only while this tab is showing.
  useEffect(() => {
    let stopped = false;
    let running = false;
    async function poll() {
      if (stopped || running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const result = await loadChatAction(requestId);
        if (result && !stopped) {
          setMessages((old) => (result.messages.length === old.length && result.messages.at(-1)?.id === old.at(-1)?.id ? old : result.messages));
          setContacts((old) => (JSON.stringify(old) === JSON.stringify(result.contacts) ? old : result.contacts));
          setCanSend(result.canSend);
        }
      } finally {
        running = false;
      }
    }
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [requestId]);

  const timeline = buildTimeline(messages, contacts, isCandidate, otherName);

  // Only the message list scrolls. It starts at the newest item and follows new ones (the page itself never jumps).
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: count.current === -1 ? "auto" : "smooth" });
    count.current = timeline.length;
  }, [timeline.length]);

  function contactAction(run: () => Promise<{ ok: boolean; message: string }>) {
    setNote(null);
    startTransition(async () => {
      try {
        const result = await run();
        setNote({ ok: result.ok, text: result.message });
        await refresh();
      } catch {
        setNote({ ok: false, text: "Something went wrong. Please try again in a moment." });
      }
    });
  }

  const askable = isCandidate ? [] : askableKinds(contacts);

  return (
    <div>
      <ul ref={list} className="flex h-[min(60dvh,34rem)] min-h-[16rem] flex-col gap-3 overflow-y-auto overscroll-contain pr-1" aria-label="Messages" role="log" aria-live="polite" tabIndex={0}>
        {timeline.length === 0 && <li className="dw-muted">No messages yet. Say hello.</li>}
        {timeline.map((e) =>
          e.type === "message" ? (
            <li key={e.key} className={e.mine ? "self-end" : "self-start"}>
              <div className={`dw-card max-w-[34rem] ${e.mine ? "dw-panel" : ""}`}>
                <p className="whitespace-pre-wrap break-words">{e.body}</p>
                <p className="mt-2 text-xs dw-muted">
                  {e.mine ? "You" : otherName}, <span suppressHydrationWarning>{clock(e.at)}</span>
                </p>
              </div>
            </li>
          ) : (
            <li key={e.key} className="self-center">
              <div className="dw-card-inner max-w-[34rem] text-center text-sm">
                <p>
                  <span aria-hidden="true">{e.kind === "phone" ? "📞" : "✉️"} </span>
                  {e.text}
                </p>
                {e.value && (
                  <p className="mt-1 break-all font-medium">
                    <a href={e.kind === "email" ? `mailto:${e.value}` : `tel:${e.value}`} className="dw-link">
                      {e.value}
                    </a>
                  </p>
                )}
                {e.canAnswer && (
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <button type="button" disabled={busy} onClick={() => contactAction(() => answerContactAction(requestId, e.kind, true))} className="dw-btn dw-btn-primary dw-btn-sm">
                      Share my {KIND_LABEL[e.kind]}
                    </button>
                    <button type="button" disabled={busy} onClick={() => contactAction(() => answerContactAction(requestId, e.kind, false))} className="dw-btn dw-btn-quiet dw-btn-sm">
                      Decline
                    </button>
                  </div>
                )}
                <p className="mt-1 text-xs dw-muted">
                  <span suppressHydrationWarning>{clock(e.at)}</span>
                </p>
              </div>
            </li>
          ),
        )}
      </ul>

      {canSend ? (
        <form
          className="dw-card sticky bottom-0 z-10 mt-4 flex flex-col gap-3 shadow-lg"
          action={(formData) => {
            formAction(formData);
            setText("");
          }}
        >
          <label htmlFor="body" className="sr-only">
            Your message
          </label>
          <textarea
            id="body"
            name="body"
            rows={2}
            maxLength={MESSAGE_MAX}
            value={text}
            placeholder="Write a message. Press Enter to send, Shift+Enter for a new line."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (text.trim().length > 0 && !pending) e.currentTarget.form?.requestSubmit();
              }
            }}
            className="dw-input"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm dw-muted">
              {text.length}/{MESSAGE_MAX} · Please do not type emails or phone numbers.
            </span>
            <div className="flex flex-wrap gap-2">
              {askable.map((kind: ContactKind) => (
                <button key={kind} type="button" disabled={busy} onClick={() => contactAction(() => askContactAction(requestId, kind))} className="dw-btn dw-btn-quiet dw-btn-sm">
                  Ask for {KIND_LABEL[kind]}
                </button>
              ))}
              <button type="submit" disabled={pending || text.trim().length === 0} className="dw-btn dw-btn-primary">
                {pending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
          {state.message && (
            <p role="alert" className="dw-alert dw-alert-error">
              {state.message}
            </p>
          )}
        </form>
      ) : (
        <p role="status" className="dw-alert dw-alert-info mt-6">
          This chat is full. Please contact each other with the phone and email buttons.
        </p>
      )}
      <p role="status" className={note ? (note.ok ? "dw-ok-text mt-3 text-sm" : "dw-bad-text mt-3 text-sm") : "sr-only"}>
        {note?.text}
      </p>
    </div>
  );
}
