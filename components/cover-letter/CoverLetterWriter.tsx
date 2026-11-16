"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LetterResult from "@/components/cover-letter/LetterResult";
import PillGroup from "@/components/cover-letter/PillGroup";
import WriteButton from "@/components/cover-letter/WriteButton";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import ResumeDropzone from "@/components/shared/ResumeDropzone";
import TextPanel from "@/components/shared/TextPanel";
import { AiError, type AiErrorCode } from "@/lib/ai/errors";
import { requestCoverLetter, type CoverLetterResponse } from "@/lib/cover-letter/client";
import {
  DEFAULT_LENGTH,
  DEFAULT_TONE,
  FIELD_LIMITS,
  LENGTH_OPTIONS,
  TONE_OPTIONS,
  canWrite,
  shouldPreselectShort,
  suggestShort,
} from "@/lib/cover-letter/form";
import type { LetterLength, Tone } from "@/lib/cover-letter/schema";
import { setLetterFeedbackDebug } from "@/lib/feedback/debug-store";
import { sampleJobDescription, sampleResume } from "@/lib/samples";
import { cleanText } from "@/lib/text-rules";

// The whole tool. It moves through these steps: form → loading → result (or error).
type Step = "form" | "loading" | "result" | "error";

// Shown one after another while the letter is being written.
const loadingLines = [
  "Reading your resume…",
  "Finding what the job asks for…",
  "Matching your real experience…",
  "Drafting your letter…",
  "Marking gaps to fill…",
];

// Error titles; the message under each one comes from the error itself.
const errorTitles: Record<AiErrorCode, string> = {
  "rate-limited": "Too many letters at once",
  timeout: "That took too long",
  "ai-failed": "We couldn't write this letter",
  offline: "You're offline",
  "invalid-input": "Please check your text",
};

export default function CoverLetterWriter() {
  const [step, setStep] = useState<Step>("form");
  const [resume, setResume] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [highlight, setHighlight] = useState("");
  const [tone, setTone] = useState<Tone>(DEFAULT_TONE);
  const [length, setLength] = useState<LetterLength>(DEFAULT_LENGTH);
  const [answer, setAnswer] = useState<CoverLetterResponse | null>(null);
  const [error, setError] = useState<AiError | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  function scrollToTop() {
    topRef.current?.scrollIntoView({ block: "start" });
  }

  // Every change to the resume goes through here. When it turns short, Short is picked for the person,
  // who can still choose Medium afterwards.
  function changeResume(next: string) {
    if (shouldPreselectShort(resume, next)) setLength("short");
    setResume(next);
  }

  // Sends the form as it is now. Used by the first write and by Regenerate (same inputs).
  function requestLetter() {
    return requestCoverLetter({
      resume: cleanText(resume),
      jobDescription: cleanText(jobDescription),
      companyName,
      roleTitle,
      highlight,
      tone,
      length,
    });
  }

  async function handleWrite() {
    if (!canWrite(resume, jobDescription)) return;
    setLetterFeedbackDebug(null); // a new request starts, so no old result stays attachable
    setStep("loading");
    setError(null);
    scrollToTop();
    // The loading animation keeps running until the server answers.
    try {
      setAnswer(await requestLetter());
      setStep("result");
    } catch (err) {
      setError(err instanceof AiError ? err : new AiError("ai-failed"));
      setStep("error");
    }
  }

  // Back to the form with everything still filled in.
  function handleEdit() {
    setLetterFeedbackDebug(null);
    setStep("form");
    scrollToTop();
  }

  function handleReset() {
    setLetterFeedbackDebug(null);
    setResume("");
    setFileName(null);
    setJobDescription("");
    setCompanyName("");
    setRoleTitle("");
    setHighlight("");
    setTone(DEFAULT_TONE);
    setLength(DEFAULT_LENGTH);
    setAnswer(null);
    setError(null);
    setStep("form");
    scrollToTop();
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            {/* Same layout as the Resume Matcher: on wide screens the privacy note sits under the resume panel. */}
            <div className="grid gap-x-5 gap-y-3 lg:grid-cols-2">
              <div className="lg:col-start-1 lg:row-start-1">
                <TextPanel
                  id="resume"
                  label="Paste your resume"
                  placeholder="Paste the full text of your resume here: summary, experience, skills..."
                  value={resume}
                  onChange={changeResume}
                  onLoadSample={() => {
                    changeResume(sampleResume);
                    setFileName(null);
                  }}
                >
                  <ResumeDropzone
                    fileName={fileName}
                    onText={(text, name) => {
                      changeResume(text);
                      setFileName(name);
                    }}
                    onRemove={() => {
                      changeResume("");
                      setFileName(null);
                    }}
                  />
                </TextPanel>
              </div>
              <p className="privacy-note mb-2 lg:col-start-1 lg:row-start-2 lg:mb-0">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                Your file is read in your browser.
              </p>
              <div className="lg:col-start-2 lg:row-start-1">
                <TextPanel
                  id="job-description"
                  label="Paste the job description"
                  placeholder="Paste the job post here: responsibilities, requirements, nice-to-haves..."
                  value={jobDescription}
                  onChange={setJobDescription}
                  onLoadSample={() => setJobDescription(sampleJobDescription)}
                />
              </div>
            </div>

            <section aria-labelledby="optional-details" className="glass-panel glow-violet mt-6">
              <h2 id="optional-details" className="font-display text-lg font-medium tracking-[-0.03em] sm:text-xl">
                Optional details
              </h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <TextField
                  id="company-name"
                  label="Company name"
                  value={companyName}
                  max={FIELD_LIMITS.company}
                  onChange={setCompanyName}
                />
                <TextField
                  id="role-title"
                  label="Role title"
                  value={roleTitle}
                  max={FIELD_LIMITS.role}
                  onChange={setRoleTitle}
                />
                <div className="md:col-span-2">
                  <TextField
                    id="highlight"
                    label="Anything to highlight?"
                    value={highlight}
                    max={FIELD_LIMITS.highlight}
                    onChange={setHighlight}
                    rows={3}
                    helper="Only things your resume shows will be used. Anything else becomes a blank for you to fill in."
                  />
                </div>
              </div>
            </section>

            {/* Tone has three pills with longer hints, so it gets more room than Length on wide screens. */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="glass-panel glow-cyan">
                <PillGroup name="tone" legend="Tone" options={TONE_OPTIONS} value={tone} onChange={setTone} />
              </div>
              <div className="glass-panel glow-cyan">
                <PillGroup name="length" legend="Length" options={LENGTH_OPTIONS} value={length} onChange={setLength} />
                {/* Always in the page, so screen readers announce the hint when it appears. */}
                <div aria-live="polite">
                  {suggestShort(resume) && (
                    <p className="mt-4 text-sm text-mist">Your resume is short, so Short usually gives a better letter.</p>
                  )}
                </div>
              </div>
            </div>

            <WriteButton resume={resume} jobDescription={jobDescription} onWrite={handleWrite} />
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div
            key="loading"
            // Tall enough that the page can scroll the tool to the top on phones.
            className="min-h-[calc(100svh-7rem)]"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <LoadingState lines={loadingLines} />
          </motion.div>
        )}

        {step === "error" && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ErrorState
              error={error}
              titles={errorTitles}
              retryLabel="Try again"
              editLabel="Edit your details"
              onRetry={handleWrite}
              onEdit={handleEdit}
            />
          </motion.div>
        )}

        {step === "result" && answer && (
          <motion.div key="result" exit={{ opacity: 0 }}>
            <LetterResult
              initial={answer}
              tone={tone}
              length={length}
              companyName={companyName}
              filled={{ company: !!companyName.trim(), role: !!roleTitle.trim(), highlight: !!highlight.trim() }}
              regenerate={requestLetter}
              onEdit={handleEdit}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
  rows?: number;
  helper?: string;
};

// A label, a one-line input (or a small text box when `rows` is given) and a live character counter.
function TextField({ id, label, value, max, onChange, rows, helper }: TextFieldProps) {
  const describedBy = `${id}-count${helper ? ` ${id}-helper` : ""}`;
  const shared = {
    id,
    value,
    maxLength: max,
    "aria-describedby": describedBy,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    autoComplete: "off",
    spellCheck: false,
    className: "field-input",
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      {rows ? <textarea {...shared} rows={rows} /> : <input type="text" {...shared} />}
      {helper && (
        <p id={`${id}-helper`} className="mt-2 text-sm text-mist">
          {helper}
        </p>
      )}
      <p id={`${id}-count`} className="mt-2 text-sm text-mist">
        {value.length} / {max}
      </p>
    </div>
  );
}
