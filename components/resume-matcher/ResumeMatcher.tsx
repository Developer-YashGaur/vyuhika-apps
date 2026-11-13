"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ErrorState from "@/components/resume-matcher/ErrorState";
import LoadingState from "@/components/resume-matcher/LoadingState";
import ResumeDropzone from "@/components/resume-matcher/ResumeDropzone";
import Results from "@/components/resume-matcher/Results";
import TextPanel from "@/components/resume-matcher/TextPanel";
import { requestAnalysis } from "@/lib/analyze/client";
import { AnalyzeError } from "@/lib/analyze/errors";
import { setFeedbackDebug } from "@/lib/feedback/debug-store";
import { sampleJobDescription, sampleResume } from "@/lib/samples";
import type { MatchResult } from "@/lib/types";
import { MAX_CHARS, MIN_CHARS, canAnalyze, cleanText, isTooLong } from "@/lib/validation";

// The whole tool. It moves through these steps: form → loading → results (or error).
type Step = "form" | "loading" | "results" | "error";

export default function ResumeMatcher() {
  const [step, setStep] = useState<Step>("form");
  const [resume, setResume] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<AnalyzeError | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Lets the feedback panel offer to attach this result (score, summary and keywords only).
  useEffect(() => {
    setFeedbackDebug(step === "results" ? result : null);
    return () => setFeedbackDebug(null);
  }, [step, result]);

  const ready = canAnalyze(resume, jobDescription);
  const tooLong = isTooLong(resume) || isTooLong(jobDescription);

  function scrollToTop() {
    topRef.current?.scrollIntoView({ block: "start" });
  }

  async function handleAnalyze() {
    if (!ready) return;
    setStep("loading");
    setError(null);
    scrollToTop();
    // The loading animation keeps running until the server answers.
    try {
      setResult(await requestAnalysis(cleanText(resume), cleanText(jobDescription)));
      setStep("results");
    } catch (err) {
      setError(err instanceof AnalyzeError ? err : new AnalyzeError("ai-failed"));
      setStep("error");
    }
  }

  // Back to the form with the text still filled in.
  function handleEdit() {
    setStep("form");
    scrollToTop();
  }

  function handleReset() {
    setResume("");
    setFileName(null);
    setJobDescription("");
    setResult(null);
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
            {/* On wide screens the privacy note sits under the resume panel (row 2, column 1);
                on phones it stays right under the resume panel, before the job panel. */}
            <div className="grid gap-x-5 gap-y-3 lg:grid-cols-2">
              <div className="lg:col-start-1 lg:row-start-1">
                <TextPanel
                  id="resume"
                  label="Paste your resume"
                  placeholder="Paste the full text of your resume here: summary, experience, skills..."
                  value={resume}
                  onChange={setResume}
                  onLoadSample={() => {
                    setResume(sampleResume);
                    setFileName(null);
                  }}
                >
                  <ResumeDropzone
                    fileName={fileName}
                    onText={(text, name) => {
                      setResume(text);
                      setFileName(name);
                    }}
                    onRemove={() => {
                      setResume("");
                      setFileName(null);
                    }}
                  />
                </TextPanel>
              </div>
              <p className="privacy-note mb-2 lg:col-start-1 lg:row-start-2 lg:mb-0">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                Your file is read in your browser and never uploaded.
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

            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!ready}
                aria-describedby="analyze-hint"
                className="btn-glow btn-lg"
              >
                Analyze match
              </button>
              <p id="analyze-hint" className="text-sm text-mist">
                {ready
                  ? "Ready when you are."
                  : tooLong
                    ? `Each box can hold up to ${MAX_CHARS.toLocaleString("en-US")} characters. Please shorten the text.`
                    : `Add at least ${MIN_CHARS} characters to each box to continue.`}
              </p>
              {/* The icon sits inline so it stays next to the first word when the text wraps on phones. */}
              <p className="max-w-md px-1 text-[0.85rem] text-mist">
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="mr-1.5 inline-block align-[-2px]">
                  <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                Your text is sent securely to an AI service to analyze it. It is not stored by Vyuhika.
              </p>
            </div>
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
            <LoadingState />
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
            <ErrorState error={error} onRetry={handleAnalyze} onEdit={handleEdit} />
          </motion.div>
        )}

        {step === "results" && result && (
          <motion.div key="results" exit={{ opacity: 0 }}>
            <Results result={result} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
