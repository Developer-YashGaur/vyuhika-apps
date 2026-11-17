"use client";

import { useActionState, useState } from "react";
import { deliverBoostAction, type BoostDeliverState } from "@/app/apps/dwaar/actions";
import { RESUME_MAX_BYTES } from "@/lib/dwaar/resume-safety";
import { ResumeFileError, readResumeFile } from "@/lib/resume-file";

const initialState: BoostDeliverState = { message: null };
type FileState = { status: "idle" | "reading" | "ok" | "error"; name: string; message: string | null };

// Shown on a paid pass. Your resume text is not kept after the free check, so you choose the file again.
// The browser reads it here; only the text is sent.
export default function BoostForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(deliverBoostAction, initialState);
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<FileState>({ status: "idle", name: "", message: null });

  async function onFileChosen(chosen: File | undefined) {
    setResumeText("");
    if (!chosen) return setFile({ status: "idle", name: "", message: null });
    const lower = chosen.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      return setFile({ status: "error", name: chosen.name, message: "Please choose a PDF or a Word (.docx) file." });
    }
    if (chosen.size > RESUME_MAX_BYTES) {
      return setFile({ status: "error", name: chosen.name, message: "That file is over 2 MB. Please choose a smaller file." });
    }
    setFile({ status: "reading", name: chosen.name, message: null });
    try {
      setResumeText(await readResumeFile(chosen));
      setFile({ status: "ok", name: chosen.name, message: null });
    } catch (error) {
      setFile({ status: "error", name: chosen.name, message: error instanceof ResumeFileError ? error.message : "We could not read that file. Please try another one." });
    }
  }

  const id = `boost-${orderId}`;
  return (
    <form action={formAction} className="mt-3 dw-panel" noValidate>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="resumeText" value={resumeText} />
      <p className="text-sm">
        <strong>Boost paid. Thank you.</strong> Choose your resume again so we can write it for this job.
      </p>
      <label htmlFor={`${id}-file`} className="dw-label mt-3 block">
        Your resume (PDF or Word, up to 2 MB)
      </label>
      <input
        id={`${id}-file`}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => onFileChosen(e.target.files?.[0])}
        aria-describedby={`${id}-status`}
        className="dw-file mt-2"
      />
      <p id={`${id}-status`} role="status" className="mt-2 text-sm">
        {file.status === "reading" && <span className="dw-muted">Reading {file.name}…</span>}
        {file.status === "ok" && <span className="dw-ok-text">✓ {file.name} is ready.</span>}
        {file.status === "error" && <span className="dw-bad-text">{file.message}</span>}
      </p>
      {state.message && (
        <p role="alert" className="mt-2 dw-alert dw-alert-error">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending || file.status !== "ok"} className="dw-btn dw-btn-primary dw-btn-sm mt-3">
        {pending ? "Writing your Boost…" : "Write my Boost"}
      </button>
      {pending && (
        <p role="status" className="dw-muted mt-2 text-xs">
          This can take up to a minute. Please keep this page open.
        </p>
      )}
    </form>
  );
}
