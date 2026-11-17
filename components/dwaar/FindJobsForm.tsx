"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { findRolesAction, type FindRolesState } from "@/app/apps/dwaar/actions";
import { RESUME_MAX_BYTES } from "@/lib/dwaar/resume-safety";
import { ResumeFileError, readResumeFile } from "@/lib/resume-file";

// "Find jobs for my resume": choose a resume, see the job titles that fit it, pick one, then pick a company where
// employees accept requests. The resume is read inside your own browser; it is not stored.

export type CompanyChoice = { id: string; name: string; referrers: number };

const initialState: FindRolesState = { message: null, roles: [] };

type FileState = { status: "idle" | "reading" | "ok" | "error"; name: string; message: string | null };

export default function FindJobsForm({ companies }: { companies: CompanyChoice[] }) {
  const [state, formAction, pending] = useActionState(findRolesAction, initialState);
  const [resumeText, setResumeText] = useState("");
  const [consent, setConsent] = useState(false);
  const [fileState, setFileState] = useState<FileState>({ status: "idle", name: "", message: null });
  const [picked, setPicked] = useState<string | null>(null);

  async function onFileChosen(chosen: File | undefined) {
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
      setResumeText(await readResumeFile(chosen));
      setFileState({ status: "ok", name: chosen.name, message: null });
    } catch (error) {
      const message = error instanceof ResumeFileError ? error.message : "We could not read that file. Please try another one.";
      setFileState({ status: "error", name: chosen.name, message });
    }
  }

  const askHref = (companyId?: string) => {
    const query = new URLSearchParams();
    if (companyId) query.set("company", companyId);
    if (picked) query.set("title", picked);
    const text = query.toString();
    return `/apps/dwaar/requests/new${text ? `?${text}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-10">
      <form action={formAction} className="dw-card flex flex-col gap-6 lg:max-w-3xl" noValidate>
        {state.message && (
          <p role="alert" className="dw-alert dw-alert-error">
            {state.message}
          </p>
        )}
        <input type="hidden" name="resumeText" value={resumeText} />

        <div>
          <label htmlFor="findResume" className="dw-label">Your resume</label>
          <p id="findResume-hint" className="dw-muted mt-1 text-sm">PDF or Word (.docx), up to 2 MB. Text-based files only, not scans.</p>
          <input
            id="findResume"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
            aria-describedby="findResume-hint findResume-status"
            className="dw-file mt-3"
          />
          <p id="findResume-status" role="status" className="mt-2 text-sm">
            {fileState.status === "reading" && <span className="dw-muted">Reading {fileState.name}…</span>}
            {fileState.status === "ok" && <span className="dw-ok-text">✓ {fileState.name} is ready.</span>}
            {fileState.status === "error" && <span className="dw-bad-text">{fileState.message}</span>}
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>
            I agree that an AI reads my resume to suggest jobs. Dwaar does not store my resume for this. See the{" "}
            <Link href="/apps/dwaar/privacy" target="_blank" className="dw-link">privacy notice</Link>.
          </span>
        </label>

        <button type="submit" disabled={pending || fileState.status !== "ok" || !consent} className="dw-btn dw-btn-primary dw-btn-lg self-start">
          {pending ? "Reading your resume…" : "Suggest jobs for me"}
        </button>
        {pending && (
          <p role="status" className="dw-muted -mt-3 text-sm">
            This can take up to a minute. Please keep this page open.
          </p>
        )}
      </form>

      {state.roles.length > 0 && (
        <section aria-labelledby="find-roles">
          <h2 id="find-roles" className="dw-h2 dw-display">Jobs that fit your resume</h2>
          <p className="dw-muted mt-2 max-w-2xl">Choose one to use as the job title when you ask for a referral.</p>
          <ul className="dw-grid mt-6">
            {state.roles.map((role) => (
              <li key={role.title} className="dw-card flex flex-col gap-3">
                <h3 className="dw-display text-xl">{role.title}</h3>
                <p className="dw-muted text-sm">{role.why}</p>
                <ul className="flex flex-wrap gap-2" aria-label="Search words">
                  {role.searchWords.map((w) => (
                    <li key={w} className="dw-chip dw-chip-info">{w}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setPicked(role.title)}
                  aria-pressed={picked === role.title}
                  className={picked === role.title ? "dw-btn dw-btn-primary dw-btn-sm self-start" : "dw-btn dw-btn-quiet dw-btn-sm self-start"}
                >
                  {picked === role.title ? "Chosen" : "Choose this job"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="find-companies">
        <h2 id="find-companies" className="dw-h2 dw-display">Companies with employees ready to refer</h2>
        <p className="dw-muted mt-2 max-w-2xl">
          These companies have employees on Dwaar who chose to receive requests.
          {picked ? ` You chose “${picked}”.` : " Choose a job above first, or pick a company and add the job later."}
        </p>
        {companies.length === 0 ? (
          <p className="dw-card mt-6">No company has employees accepting requests yet. You can still ask for a referral at any listed company.</p>
        ) : (
          <ul className="dw-grid mt-6">
            {companies.map((c) => (
              <li key={c.id} className="dw-card flex items-center justify-between gap-4">
                <div>
                  <p className="dw-display text-lg">{c.name}</p>
                  <p className="dw-muted text-sm">
                    {c.referrers} {c.referrers === 1 ? "employee" : "employees"} accepting requests
                  </p>
                </div>
                <Link href={askHref(c.id)} className="dw-btn dw-btn-primary dw-btn-sm">Ask here</Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6">
          <Link href={askHref()} className="dw-link">Ask at another company</Link>
        </p>
      </section>
    </div>
  );
}
