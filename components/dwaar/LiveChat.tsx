"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { loadChatAction, sendMessageAction, type ChatFormState } from "@/app/apps/dwaar/actions";
import { MESSAGE_MAX, type ChatMessageView } from "@/lib/dwaar/chat";

// The live chat: messages appear by themselves (the page asks for new ones every few seconds while it is open and
// visible), and Enter sends. Nothing is emailed for chat messages.

const POLL_MS = 3000;
const initialState: ChatFormState = { message: null, sent: false };

function clock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function LiveChat({ requestId, otherName, initialMessages, initialCanSend }: { requestId: string; otherName: string; initialMessages: ChatMessageView[]; initialCanSend: boolean }) {
  const [messages, setMessages] = useState(initialMessages);
  const [canSend, setCanSend] = useState(initialCanSend);
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState(async (prev: ChatFormState, formData: FormData) => {
    const next = await sendMessageAction(requestId, prev, formData);
    if (next.messages) setMessages(next.messages);
    return next;
  }, initialState);
  const bottom = useRef<HTMLLIElement>(null);
  const count = useRef(initialMessages.length);

  // Ask for new messages every few seconds, but only while this tab is showing.
  useEffect(() => {
    let stopped = false;
    let busy = false;
    async function poll() {
      if (stopped || busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const result = await loadChatAction(requestId);
        if (result && !stopped) {
          setMessages((old) => (result.messages.length === old.length && result.messages.at(-1)?.id === old.at(-1)?.id ? old : result.messages));
          setCanSend(result.canSend);
        }
      } finally {
        busy = false;
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

  // Scroll to the newest message when one arrives (not on first load).
  useEffect(() => {
    if (messages.length > count.current) bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    count.current = messages.length;
  }, [messages]);

  return (
    <div>
      <ul className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1" aria-label="Messages" role="log" aria-live="polite">
        {messages.length === 0 && <li className="dw-muted">No messages yet. Say hello.</li>}
        {messages.map((m) => (
          <li key={m.id} className={m.mine ? "self-end" : "self-start"}>
            <div className={`dw-card max-w-[34rem] ${m.mine ? "dw-panel" : ""}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-2 text-xs dw-muted">
                {m.mine ? "You" : otherName}, <span suppressHydrationWarning>{clock(m.at)}</span>
              </p>
            </div>
          </li>
        ))}
        <li ref={bottom} aria-hidden="true" />
      </ul>

      {canSend ? (
        <form
          className="dw-card mt-6 flex flex-col gap-3"
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
            rows={3}
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
              {text.length}/{MESSAGE_MAX} · Please do not type emails or phone numbers. Use the buttons below to ask for or share them.
            </span>
            <button type="submit" disabled={pending || text.trim().length === 0} className="dw-btn dw-btn-primary">
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
          {state.message && (
            <p role="alert" className="dw-alert dw-alert-error">
              {state.message}
            </p>
          )}
        </form>
      ) : (
        <p role="status" className="dw-alert dw-alert-info mt-6">
          This chat is full. Please use the contact buttons below to continue.
        </p>
      )}
    </div>
  );
}
