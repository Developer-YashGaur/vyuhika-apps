import { replaceResumeAction } from "@/app/apps/dwaar/actions";

const RESULT: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Done. This request now uses your improved resume. The old file was deleted." },
  failed: { ok: false, text: "We could not swap the resume. Your old resume is still on the request. Please try again." },
  locked: { ok: false, text: "An employee already accepted this request, so its resume and score can no longer be changed." },
  closed: { ok: false, text: "This request is closed or cancelled, so its resume cannot be changed." },
};

// After a Boost: the person chooses whether the improved resume replaces the one on this request.
// It is their choice, so it is a button, never automatic. An employee who may see the resume sees the new one from then on.
export default function ReplaceResume({ requestId, result, open }: { requestId: string; result: string | null; open: boolean }) {
  const note = result ? RESULT[result] : undefined;
  return (
    <section aria-labelledby="dw-replace" className="dw-card lg:col-span-2">
      <h2 id="dw-replace" className="dw-display text-xl font-medium">
        Use the improved resume on this request?
      </h2>
      <p className="dw-muted mt-2 text-sm leading-relaxed">
        Your request still has the resume you first uploaded. Until an employee accepts, you can swap it for this improved one, and the request then shows this resume&apos;s new score to you and to employees. Read it first and fix any [placeholder].
        The old file is deleted when you swap. After an employee accepts, the resume and score are fixed.
      </p>
      {note && (
        <p role="status" className={`dw-alert mt-3 text-sm ${note.ok ? "dw-alert-good" : "dw-alert-info"}`}>
          {note.text}
        </p>
      )}
      {!open && (
        <p className="dw-alert dw-alert-info mt-3 text-sm">
          This request can no longer change its resume, because an employee accepted it or it was cancelled. You can still download this improved resume above and use it elsewhere.
        </p>
      )}
      {open && <form action={replaceResumeAction} className="mt-4 flex flex-wrap gap-3">
        <input type="hidden" name="requestId" value={requestId} />
        <button type="submit" className="dw-btn dw-btn-primary">
          Replace my resume with this one
        </button>
        <span className="dw-muted self-center text-sm">Or keep your first resume and just download this one above.</span>
      </form>}
    </section>
  );
}
