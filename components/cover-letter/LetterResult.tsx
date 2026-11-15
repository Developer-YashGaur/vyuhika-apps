"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AiError } from "@/lib/ai/errors";
import type { CoverLetterResponse } from "@/lib/cover-letter/client";
import { LENGTH_OPTIONS, TONE_OPTIONS } from "@/lib/cover-letter/form";
import {
  blanksLabel,
  countWords,
  downloadFilename,
  findPlaceholders,
  gapRange,
  needsReplaceConfirm,
  nextPlaceholderRange,
  noteMessages,
  type Range,
} from "@/lib/cover-letter/result";
import type { LetterLength, Tone } from "@/lib/cover-letter/schema";

// The result view: the editable letter on the left, the "Gaps to fill" cards on the right.
// The letter text lives here, so the person's edits survive a failed regenerate.

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

type Props = {
  initial: CoverLetterResponse;
  tone: Tone;
  length: LetterLength;
  companyName: string;
  // Asks the server for a new letter with the same inputs. Throws an AiError when it fails.
  regenerate: () => Promise<CoverLetterResponse>;
  onEdit: () => void;
  onReset: () => void;
};

export default function LetterResult({ initial, tone, length, companyName, regenerate, onEdit, onReset }: Props) {
  const [answer, setAnswer] = useState(initial);
  const [letter, setLetter] = useState(initial.letter);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [regenError, setRegenError] = useState<AiError | null>(null);
  const [confirming, setConfirming] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const regenerateRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const blanks = findPlaceholders(letter);
  const notes = noteMessages(answer.notes);
  const toneLabel = TONE_OPTIONS.find((o) => o.value === tone)?.label ?? tone;
  const lengthLabel = LENGTH_OPTIONS.find((o) => o.value === length)?.label ?? length;

  // Screen readers start at the new heading, like on the error screen.
  useEffect(() => {
    headingRef.current?.focus();
    return () => clearTimeout(copyTimer.current);
  }, []);

  // The letter box grows with the text, so the page scrolls instead of the box.
  useLayoutEffect(() => {
    const box = textareaRef.current;
    if (!box) return;
    function fit() {
      if (!box) return;
      box.style.height = "auto";
      // scrollHeight leaves out the border, which the box's height includes.
      box.style.height = `${box.scrollHeight + box.offsetHeight - box.clientHeight}px`;
    }
    fit();
    window.addEventListener("resize", fit); // the lines wrap differently when the width changes
    return () => window.removeEventListener("resize", fit);
  }, [letter]);

  // The safe choice gets focus first when the confirm panel opens.
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  // Selects a blank in the letter, scrolls it into view and says which one it is.
  function selectBlank(range: Range) {
    const box = textareaRef.current;
    if (!box) return;
    box.focus({ preventScroll: true });
    box.setSelectionRange(range.start, range.end);
    scrollToIndex(box, range.start);
    const all = findPlaceholders(box.value);
    const number = all.findIndex((r) => r.start === range.start) + 1;
    setAnnouncement(`Blank ${number} of ${all.length} selected: ${box.value.slice(range.start + 1, range.end - 1)}`);
  }

  function handleNextBlank() {
    const box = textareaRef.current;
    if (!box) return;
    const range = nextPlaceholderRange(letter, box.selectionEnd);
    if (range) selectBlank(range);
    else setAnnouncement("No blanks left to fill.");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(letter);
    } catch {
      setAnnouncement("Couldn't copy automatically. Select the letter and copy it yourself.");
      return;
    }
    setCopied(true);
    setAnnouncement("Copied");
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      setCopied(false);
      setAnnouncement("");
    }, 2000);
  }

  // The file is made in the browser; nothing is sent anywhere.
  function handleDownload() {
    const url = URL.createObjectURL(new Blob([letter], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFilename(companyName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAnnouncement("Download started.");
  }

  async function runRegenerate() {
    setConfirming(false);
    setRegenError(null);
    setBusy(true);
    setAnnouncement("Writing a new letter…");
    try {
      const next = await regenerate();
      setAnswer(next);
      setLetter(next.letter);
      setAnnouncement("New letter ready.");
    } catch (err) {
      // The current letter and the person's edits stay exactly as they were.
      setRegenError(err instanceof AiError ? err : new AiError("ai-failed"));
      setAnnouncement("");
    } finally {
      setBusy(false);
    }
  }

  function handleRegenerate() {
    if (needsReplaceConfirm(letter, answer.letter)) setConfirming(true);
    else runRegenerate();
  }

  function keepEdits() {
    setConfirming(false);
    regenerateRef.current?.focus();
  }

  return (
    <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.15 }}>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <motion.section variants={fadeUp} aria-labelledby="letter-heading" className="glass-panel letter-panel glow-cyan">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <h2
              id="letter-heading"
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-2xl font-medium tracking-[-0.03em] outline-none sm:text-3xl"
            >
              Your cover letter
            </h2>
            <ul className="flex flex-wrap gap-2" aria-label="Settings used">
              <li className="chip chip-cyan">{toneLabel} tone</li>
              <li className="chip chip-cyan">{lengthLabel} length</li>
            </ul>
          </div>

          <p className="notice notice-cyan mt-5">
            <InfoIcon />
            <span>
              <strong className="font-semibold text-ink">Check every fact before you send.</strong> This letter is a
              draft written from your resume.
            </span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span role="status" className={`chip ${blanks.length === 0 ? "chip-cyan" : "chip-violet"}`}>
              {blanksLabel(blanks.length)}
            </span>
            <button type="button" onClick={handleNextBlank} disabled={blanks.length === 0} className="text-link text-sm">
              Next blank
            </button>
          </div>

          <label htmlFor="letter-text" className="sr-only">
            Your cover letter (you can edit it)
          </label>
          <textarea
            id="letter-text"
            ref={textareaRef}
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            readOnly={busy}
            spellCheck
            className="letter-textarea mt-4"
          />
          <p className="mt-3 text-sm text-mist">{countWords(letter).toLocaleString("en-US")} words</p>

          {/* Phones: Copy on its own row, then two by two. Wider screens: one row that wraps if it has to. */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <button type="button" onClick={handleCopy} className="btn-glow btn-sm col-span-2 min-w-[7.5rem]">
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={handleDownload} className="btn-ghost btn-sm">
              Download .txt
            </button>
            <button
              type="button"
              ref={regenerateRef}
              onClick={handleRegenerate}
              disabled={busy}
              aria-busy={busy}
              className="btn-ghost btn-sm"
            >
              {busy ? "Writing…" : "Regenerate"}
            </button>
            <button type="button" onClick={onEdit} className="btn-ghost btn-sm">
              Edit inputs
            </button>
            <button type="button" onClick={onReset} className="btn-ghost btn-sm">
              Start over
            </button>
          </div>

          {confirming && (
            <div
              role="alertdialog"
              aria-labelledby="replace-title"
              aria-describedby="replace-text"
              onKeyDown={(e) => e.key === "Escape" && keepEdits()}
              className="notice notice-violet mt-5 flex-col"
            >
              <h3 id="replace-title" className="font-display text-lg font-medium tracking-[-0.02em] text-ink">
                Replace your edits?
              </h3>
              <p id="replace-text">
                Regenerating writes a new letter and replaces the changes you made to this one. It also counts toward
                your limit.
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                <button type="button" ref={keepRef} onClick={keepEdits} className="btn-ghost btn-sm">
                  Keep my edits
                </button>
                <button type="button" onClick={runRegenerate} className="btn-glow btn-sm">
                  Replace my edits
                </button>
              </div>
            </div>
          )}

          {regenError && (
            <p role="alert" className="notice notice-rose mt-5">
              <span>{regenError.message} Your current letter and your edits are still here.</span>
            </p>
          )}

          {notes.length > 0 && (
            <ul className="mt-5 space-y-3">
              {notes.map((message) => (
                <li key={message} className="notice notice-violet">
                  <InfoIcon />
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Spoken updates (Copied, which blank is selected, regenerate progress). */}
          <p role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </motion.section>

        <motion.section
          variants={fadeUp}
          aria-labelledby="gaps-heading"
          className="glass-panel glow-violet gaps-sticky"
        >
          <h2 id="gaps-heading" className="font-display text-xl font-medium tracking-[-0.03em] sm:text-2xl">
            Gaps to fill <span className="text-mist">({answer.gaps.length})</span>
          </h2>

          {answer.gaps.length === 0 ? (
            <p className="mt-4 leading-relaxed text-mist">Nothing to fill in. Your resume covered what the job asks for.</p>
          ) : (
            <>
              <ul className="mt-5 space-y-3">
                {answer.gaps.map((gap, i) => {
                  const range = gapRange(letter, gap);
                  return (
                    <li key={gap.placeholder}>
                      <button
                        type="button"
                        disabled={!range}
                        onClick={() => range && selectBlank(range)}
                        className="gap-card"
                      >
                        <span className="gap-number" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold uppercase tracking-wider text-mist">
                            The job asks for
                          </span>
                          <span className="mt-1 block font-medium text-ink">{gap.need}</span>
                          {range ? (
                            <span className="mt-2 block text-sm leading-relaxed text-violet-200">{gap.placeholder}</span>
                          ) : (
                            <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-accent">
                              <CheckIcon />
                              Filled in
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-mist">
                Blanks are things the job asks for that your resume doesn&apos;t show. Add a real example, or delete the
                sentence.
              </p>
            </>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}

// A textarea that is as tall as its text has no scrollbar of its own, so the page has to scroll.
// To know how far down a character is, a hidden copy of the text (same font and width) is measured.
function scrollToIndex(box: HTMLTextAreaElement, index: number) {
  const style = getComputedStyle(box);
  const mirror = document.createElement("div");
  for (const prop of [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "boxSizing",
  ] as const) {
    mirror.style[prop] = style[prop];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.left = "-9999px";
  mirror.style.width = style.width;
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.textContent = box.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const offset = marker.offsetTop;
  mirror.remove();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: window.scrollY + box.getBoundingClientRect().top + offset - window.innerHeight * 0.35,
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="mt-0.5 shrink-0">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.2V11M8 4.9v.01" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
