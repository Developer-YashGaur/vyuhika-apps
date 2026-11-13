"use client";

import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { sendFeedback } from "@/lib/feedback/client";
import { useFeedbackDebug } from "@/lib/feedback/debug-store";
import {
  FEEDBACK_TYPES,
  MATCHER_PATH,
  MESSAGE_MAX,
  MESSAGE_MIN,
  describeBrowser,
  isValidEmail,
  type FeedbackType,
} from "@/lib/feedback/rules";

// The floating "Feedback" button (on every page) and the panel it opens.
// The panel is a native <dialog>: it makes the rest of the page inert and closes with Esc.

type Status = "editing" | "sending" | "sent";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea, [href]';

export default function FeedbackWidget() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ids = useId();
  const debug = useFeedbackDebug();

  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("/");
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, stays empty for people
  const [includeResult, setIncludeResult] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [triedToSend, setTriedToSend] = useState(false);
  const [status, setStatus] = useState<Status>("editing");
  const [error, setError] = useState<string | null>(null);

  const count = message.trim().length;
  const messageOk = count >= MESSAGE_MIN && count <= MESSAGE_MAX;
  const emailOk = email.trim() === "" || isValidEmail(email.trim());
  const onMatcher = path === MATCHER_PATH;
  const showResultOption = onMatcher && type === "wrong-result";

  function openPanel() {
    // Read the path when opening (not during render) so server and browser HTML always match.
    setPath(window.location.pathname);
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closePanel() {
    dialogRef.current?.close();
  }

  // Runs however the dialog closes (Esc, close button, backdrop click).
  function handleClosed() {
    setOpen(false);
    if (status === "sent") resetForm();
    buttonRef.current?.focus();
  }

  function resetForm() {
    setType("bug");
    setMessage("");
    setEmail("");
    setWebsite("");
    setIncludeResult(false);
    setEmailTouched(false);
    setTriedToSend(false);
    setStatus("editing");
    setError(null);
  }

  // Keeps Tab and Shift+Tab cycling inside the panel.
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    setTriedToSend(true);
    if (!messageOk || !emailOk || status === "sending") return;

    setStatus("sending");
    setError(null);
    try {
      await sendFeedback({
        type,
        message: message.trim(),
        email: email.trim(),
        website,
        context: {
          path,
          timestamp: new Date().toISOString(),
          browser: describeBrowser(navigator.userAgent, window.innerWidth, window.innerHeight),
        },
        // Only score, summary and keywords; the store never holds resume or job text.
        debug: showResultOption && includeResult && debug ? debug : undefined,
      });
      setStatus("sent");
    } catch (err) {
      setError((err as Error).message);
      setStatus("editing");
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-label="Send feedback"
        className={`feedback-fab ${open ? "is-hidden" : ""}`}
      >
        <ChatIcon />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${ids}-title`}
        className="feedback-dialog"
        data-lenis-prevent
        onClose={handleClosed}
        onKeyDown={trapFocus}
        // A click on the dark area around the panel lands on the <dialog> itself.
        onClick={(e) => e.target === dialogRef.current && closePanel()}
      >
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="feedback-panel"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={`${ids}-title`} className="font-display text-xl font-medium tracking-[-0.03em]">
                {status === "sent" ? "Feedback sent" : "Send feedback"}
              </h2>
              <button type="button" onClick={closePanel} className="file-chip-remove -mt-1 -mr-1" aria-label="Close">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {status === "sent" ? (
              <div role="status" className="flex flex-col items-center py-8 text-center">
                <span className="feedback-success-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </span>
                <p className="mt-5 font-display text-2xl font-medium tracking-[-0.03em]">Thanks, it really helps</p>
                <p className="mt-2 text-mist">Every message is read by a real person.</p>
                <button type="button" onClick={closePanel} className="btn-ghost mt-8">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
                <fieldset>
                  <legend className="text-sm font-medium text-ink">What is it about?</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {FEEDBACK_TYPES.map((t) => (
                      <label key={t.value} className={`feedback-type ${type === t.value ? "is-selected" : ""}`}>
                        <input
                          type="radio"
                          name="feedback-type"
                          value={t.value}
                          checked={type === t.value}
                          onChange={() => setType(t.value)}
                          className="sr-only"
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor={`${ids}-message`} className="text-sm font-medium text-ink">
                    Your message
                  </label>
                  <textarea
                    id={`${ids}-message`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={MESSAGE_MAX}
                    required
                    rows={5}
                    aria-describedby={`${ids}-count`}
                    aria-invalid={triedToSend && !messageOk}
                    placeholder={
                      type === "bug"
                        ? "What happened, and what did you expect?"
                        : type === "wrong-result"
                          ? "Which part of the result looks wrong?"
                          : "Tell us what's on your mind..."
                    }
                    className="feedback-input mt-2 resize-y"
                  />
                  <p
                    id={`${ids}-count`}
                    className={`mt-1.5 text-xs ${triedToSend && !messageOk ? "text-rose-200" : "text-mist"}`}
                  >
                    {count < MESSAGE_MIN
                      ? `${count} / ${MESSAGE_MAX} characters (please write at least ${MESSAGE_MIN})`
                      : `${count} / ${MESSAGE_MAX} characters`}
                  </p>
                </div>

                <div>
                  <label htmlFor={`${ids}-email`} className="text-sm font-medium text-ink">
                    Email <span className="font-normal text-mist">(optional, if you&apos;d like a reply)</span>
                  </label>
                  <input
                    id={`${ids}-email`}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    aria-invalid={emailTouched && !emailOk}
                    aria-describedby={emailTouched && !emailOk ? `${ids}-email-error` : undefined}
                    placeholder="you@example.com"
                    className="feedback-input mt-2"
                  />
                  {emailTouched && !emailOk && (
                    <p id={`${ids}-email-error`} className="mt-1.5 text-xs text-rose-200">
                      That doesn&apos;t look like an email address.
                    </p>
                  )}
                </div>

                {/* Honeypot: hidden from people and screen readers; bots tend to fill it in. */}
                <div className="feedback-honeypot" aria-hidden="true">
                  <label htmlFor={`${ids}-website`}>Website</label>
                  <input
                    id={`${ids}-website`}
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {showResultOption && (
                  <label className={`feedback-check ${debug ? "" : "is-disabled"}`}>
                    <input
                      type="checkbox"
                      checked={includeResult && !!debug}
                      disabled={!debug}
                      onChange={(e) => setIncludeResult(e.target.checked)}
                    />
                    <span>
                      Include my score and keywords to help debug (your resume and job text are never included)
                      {!debug && <span className="mt-1 block text-mist">Run an analysis first to include a result.</span>}
                    </span>
                  </label>
                )}

                {error && (
                  <p role="alert" className="upload-error">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-mist sm:max-w-[14rem]">
                    We also send this page&apos;s address, the time, and your browser and window size.
                  </p>
                  <button type="submit" disabled={status === "sending"} className="btn-glow shrink-0">
                    {status === "sending" ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </dialog>
    </>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
    </svg>
  );
}
