"use client";

import { useActionState } from "react";
import { confirmWorkEmailAction, sendWorkEmailCodeAction, type WorkEmailState } from "@/app/apps/dwaar/actions";

// Shown to referral providers whose work email is not confirmed yet: "email me a code", then "type the code".

const start: WorkEmailState = { sent: false, message: null, error: null };

export default function WorkEmailConfirm({ email, available }: { email: string; available: boolean }) {
  const [sendState, sendAction, sending] = useActionState(sendWorkEmailCodeAction, start);
  const [confirmState, confirmAction, confirming] = useActionState(confirmWorkEmailAction, start);

  if (!available) {
    return (
      <section className="dw-paper mt-6 max-w-2xl">
        <h3 className="font-display text-xl font-medium tracking-[-0.03em]">Confirm your work email</h3>
        <p className="mt-2 text-sm dw-muted">Confirming work emails is not switched on yet. We will tell you when it is.</p>
      </section>
    );
  }

  const error = confirmState.error ?? sendState.error;
  const sent = sendState.sent;

  return (
    <section className="dw-paper mt-6 max-w-2xl" aria-labelledby="confirm-heading">
      <h3 id="confirm-heading" className="font-display text-xl font-medium tracking-[-0.03em]">
        Confirm your work email
      </h3>
      <p className="mt-2 text-sm leading-relaxed dw-muted">
        We will email a 6-digit code to <strong className="break-all">{email}</strong>. Typing it here shows that the
        address is yours.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-700/40 bg-rose-100 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      )}
      {sent && !error && (
        <p role="status" className="mt-4 rounded-xl border border-cyan-700/40 bg-cyan-100 px-4 py-3 text-sm text-cyan-950">
          {sendState.message}
        </p>
      )}

      {sent && (
        <form action={confirmAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="code" className="text-sm font-medium">
              Your 6-digit code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              className="field-input mt-2 tracking-[0.3em]"
              required
            />
          </div>
          <button type="submit" disabled={confirming} className="btn-glow btn-lg">
            {confirming ? "Checking…" : "Confirm"}
          </button>
        </form>
      )}

      <form action={sendAction} className="mt-4">
        <button type="submit" disabled={sending} className={sent ? "btn-ghost btn-sm" : "btn-glow btn-lg"}>
          {sending ? "Sending…" : sent ? "Send a new code" : "Email me a code"}
        </button>
      </form>
    </section>
  );
}
