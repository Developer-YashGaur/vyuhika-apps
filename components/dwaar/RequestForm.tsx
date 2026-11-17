"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createRequestAction, type RequestFormState } from "@/app/apps/dwaar/actions";
import MatchCheck from "@/components/dwaar/MatchCheck";
import { readPrefill } from "@/lib/dwaar/prefill";
import { JOB_DESCRIPTION_LIMITS, REQUEST_LIMITS, type RequestFieldName } from "@/lib/dwaar/request-form";
import { RESUME_MAX_BYTES } from "@/lib/dwaar/resume-safety";
import type { CompanyOption } from "@/lib/dwaar/profile";
import { ResumeFileError, readResumeFile } from "@/lib/resume-file";

// "Ask for a referral": company, job details, your resume, and a short note. "Check my match" shows your score and
// tips first. "Send request" works only when the score is high enough. The resume is read inside your own browser;
// the file is stored privately only when the request is sent.

const initialState: RequestFormState = { errors: {}, message: null };

type FileState = { status: "idle" | "reading" | "ok" | "error"; name: string; message: string | null };

export default function RequestForm({ companies, initial }: { companies: CompanyOption[]; initial?: { companyId: string; jobTitle: string; jobUrl?: string } }) {
  const [state, formAction, pending] = useActionState(createRequestAction, initialState);
  const [values, setValues] = useState({ companyId: initial?.companyId ?? "", jobTitle: initial?.jobTitle ?? "", jobUrl: initial?.jobUrl ?? "", jobId: "", jobDescription: "", note: "" });
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [fileState, setFileState] = useState<FileState>({ status: "idle", name: "", message: null });
  // From "Find openings": the description of the chosen opening was saved in this browser tab; fill it in once.
  useEffect(() => {
    const description = readPrefill(initial?.jobUrl);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage exists only in the browser, so this cannot be the first render
    if (description) setValues((v) => (v.jobDescription ? v : { ...v, jobDescription: description }));
  }, [initial?.jobUrl]);
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const { errors } = state;
  const errorId = (n: RequestFieldName) => `${n}-error`;
  const describe = (n: RequestFieldName) => (errors[n] ? errorId(n) : undefined);

  async function onFileChosen(chosen: File | undefined) {
    setFile(null);
    setResumeText("");
    if (!chosen) return setFileState({ status: "idle", name: "", message: null });

    const lower = chosen.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      return setFileState({ status: "error", name: chosen.name, message: "Please choose a PDF or a Word (.docx) file." });
    }
    if (chosen.size > RESUME_MAX_BYTES) {
      return setFileState({ status: "error", name: chosen.name, message: "That file is over 2 MB. Please choose a smaller file." });
    }
    setFileState({ status: "reading", name: chosen.name, message: null });
    try {
      const text = await readResumeFile(chosen);
      setFile(chosen);
      setResumeText(text);
      setFileState({ status: "ok", name: chosen.name, message: null });
    } catch (error) {
      const message = error instanceof ResumeFileError ? error.message : "We could not read that file. Please try another one.";
      setFileState({ status: "error", name: chosen.name, message });
    }
  }

  return (
    <form
      // The chosen file is kept in memory, so it is not lost if the server sends back an error.
      action={(formData) => {
        if (file) formData.set("resume", file);
        formAction(formData);
      }}
      className="dw-card dw-cols"
      noValidate
    >
      {state.message && (
        <p role="alert" className="dw-alert dw-alert-error dw-span">
          {state.message}
        </p>
      )}
      <input type="hidden" name="resumeText" value={resumeText} />

      <fieldset className="flex flex-col gap-7">
        <legend className="dw-step">1 · The job</legend>

        <div>
          <label htmlFor="companyId" className="dw-label">Which company?</label>
          {companies.length === 0 ? (
            <p className="dw-muted mt-3 text-sm">No companies are listed yet. Please check back soon.</p>
          ) : (
            <select
              id="companyId"
              name="companyId"
              value={values.companyId}
              onChange={(e) => set("companyId", e.target.value)}
              aria-invalid={errors.companyId ? true : undefined}
              aria-describedby={describe("companyId")}
              className="dw-input mt-3"
            >
              <option value="">Choose a company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <FieldError id={errorId("companyId")} message={errors.companyId} />
        </div>

        <div className="grid gap-7 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="jobTitle" className="dw-label">Job you are applying for</label>
            <input
              id="jobTitle"
              name="jobTitle"
              value={values.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
              maxLength={REQUEST_LIMITS.jobTitle}
              placeholder="For example: Backend Engineer"
              aria-invalid={errors.jobTitle ? true : undefined}
              aria-describedby={describe("jobTitle")}
              className="dw-input mt-3"
            />
            <FieldError id={errorId("jobTitle")} message={errors.jobTitle} />
          </div>
          <div>
            <label htmlFor="jobId" className="dw-label">
              Job ID <span className="dw-muted text-sm font-normal">(optional)</span>
            </label>
            <input
              id="jobId"
              name="jobId"
              value={values.jobId}
              onChange={(e) => set("jobId", e.target.value)}
              maxLength={REQUEST_LIMITS.jobId}
              placeholder="REQ-12345"
              aria-invalid={errors.jobId ? true : undefined}
              aria-describedby={describe("jobId")}
              className="dw-input mt-3"
            />
            <FieldError id={errorId("jobId")} message={errors.jobId} />
          </div>
        </div>

        <div>
          <label htmlFor="jobUrl" className="dw-label">Link to the job posting</label>
          <input
            id="jobUrl"
            name="jobUrl"
            type="url"
            inputMode="url"
            value={values.jobUrl}
            onChange={(e) => set("jobUrl", e.target.value)}
            maxLength={REQUEST_LIMITS.jobUrl}
            placeholder="https://company.com/careers/123"
            aria-invalid={errors.jobUrl ? true : undefined}
            aria-describedby={describe("jobUrl")}
            className="dw-input mt-3"
          />
          <FieldError id={errorId("jobUrl")} message={errors.jobUrl} />
        </div>

        <div>
          <label htmlFor="jobDescription" className="dw-label">Job description</label>
          <p id="jobDescription-hint" className="dw-muted mt-1 text-sm">
            Paste the responsibilities and requirements. We compare your resume with it.
          </p>
          <textarea
            id="jobDescription"
            name="jobDescription"
            rows={7}
            value={values.jobDescription}
            onChange={(e) => set("jobDescription", e.target.value)}
            maxLength={JOB_DESCRIPTION_LIMITS.max}
            aria-invalid={errors.jobDescription ? true : undefined}
            aria-describedby={["jobDescription-hint", describe("jobDescription")].filter(Boolean).join(" ")}
            className="dw-input mt-3"
          />
          <p className="dw-muted mt-1 text-right text-xs">{values.jobDescription.length}/{JOB_DESCRIPTION_LIMITS.max}</p>
          <FieldError id={errorId("jobDescription")} message={errors.jobDescription} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-7">
        <legend className="dw-step">2 · Your resume</legend>

        <div>
          <label htmlFor="resumeFile" className="dw-label">Attach your resume</label>
          <p id="resumeFile-hint" className="dw-muted mt-1 text-sm">PDF or Word (.docx), up to 2 MB. Text-based files only, not scans.</p>
          <input
            id="resumeFile"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
            aria-invalid={errors.resume || fileState.status === "error" ? true : undefined}
            aria-describedby={["resumeFile-hint", "resumeFile-status", describe("resume")].filter(Boolean).join(" ")}
            className="dw-file mt-3"
          />
          <p id="resumeFile-status" role="status" className="mt-2 text-sm">
            {fileState.status === "reading" && <span className="dw-muted">Reading {fileState.name}…</span>}
            {fileState.status === "ok" && <span className="dw-ok-text">✓ {fileState.name} is ready.</span>}
            {fileState.status === "error" && <span className="dw-bad-text">{fileState.message}</span>}
          </p>
          <FieldError id={errorId("resume")} message={errors.resume} />
        </div>

        <div>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={describe("consent")}
              className="mt-1 h-4 w-4 "
            />
            <span>
              I agree that Dwaar stores my resume privately and that an AI reads it with the job description to give me a match
              score and tips. Employees never see my resume or my score. See the{" "}
              <Link href="/apps/dwaar/privacy" target="_blank" className="dw-link">privacy notice</Link>.
            </span>
          </label>
          <FieldError id={errorId("consent")} message={errors.consent} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-7">
        <legend className="dw-step">3 · A word for the employee</legend>
        <div>
          <label htmlFor="note" className="dw-label">
            A short note <span className="dw-muted text-sm font-normal">(optional)</span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={4}
            value={values.note}
            onChange={(e) => set("note", e.target.value)}
            maxLength={REQUEST_LIMITS.note}
            placeholder="Two or three lines: your experience and why this role fits you."
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={describe("note")}
            className="dw-input mt-3"
          />
          <p className="dw-muted mt-1 text-right text-xs">{values.note.length}/{REQUEST_LIMITS.note}</p>
          <FieldError id={errorId("note")} message={errors.note} />
        </div>
        <p className="dw-muted text-sm leading-relaxed">
          Employees at this company see your name, headline, the job and your note. Your email is never shared. The person who
          accepts can read one message from you in Dwaar. They do not see your resume.
        </p>
      </fieldset>

      {state.check && <div className="dw-span"><MatchCheck check={state.check} /></div>}

      <div className="dw-span flex flex-col gap-3 sm:flex-row">
        <button type="submit" name="intent" value="check" disabled={pending || fileState.status === "reading"} className="dw-btn dw-btn-quiet dw-btn-lg">
          {pending ? "Working…" : "Check my match"}
        </button>
        <button type="submit" name="intent" value="send" disabled={pending || fileState.status === "reading"} className="dw-btn dw-btn-primary dw-btn-lg">
          {pending ? "Working…" : "Send request"}
        </button>
        <Link href="/apps/dwaar/requests" className="dw-btn dw-btn-quiet dw-btn-lg text-center">Cancel</Link>
      </div>
      {pending && (
        <p role="status" className="dw-muted -mt-3 text-sm">
          Checking your resume against the job. This can take up to a minute. Please keep this page open.
        </p>
      )}
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm dw-bad-text">
      {message}
    </p>
  );
}
