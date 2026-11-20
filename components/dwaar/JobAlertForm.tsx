"use client";

import { useActionState } from "react";
import { saveJobAlertAction, type JobAlertState } from "@/app/apps/dwaar/actions";

// Plus job alert: type the words, we email new matching jobs after each update (twice a day).
const start: JobAlertState = { message: null, ok: false };

export default function JobAlertForm({ keywords, active }: { keywords: string; active: boolean }) {
  const [state, formAction, pending] = useActionState(saveJobAlertAction, start);
  return (
    <form action={formAction} className="dw-card mb-6 grid gap-3" aria-labelledby="dw-alert-title">
      <h2 id="dw-alert-title" className="dw-display text-lg">
        Job alert {active && <span className="dw-muted text-sm font-normal">(on)</span>}
      </h2>
      <p className="dw-muted text-sm">Get an email when new jobs match your words. For example: python developer pune.</p>
      <div className="dw-jobsearch">
        <label htmlFor="dw-alert-words" className="sr-only">
          Words for your job alert
        </label>
        <input id="dw-alert-words" name="keywords" defaultValue={keywords} required minLength={2} maxLength={80} className="dw-input" placeholder="Role, skill or place" />
        <button type="submit" name="intent" value="on" className="dw-btn dw-btn-primary" disabled={pending}>
          {active ? "Update alert" : "Turn on alert"}
        </button>
        {active && (
          <button type="submit" name="intent" value="off" formNoValidate className="dw-btn dw-btn-quiet" disabled={pending}>
            Turn off
          </button>
        )}
      </div>
      {state.message && (
        <p role="status" className={state.ok ? "dw-alert dw-alert-info" : "dw-alert dw-alert-error"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
