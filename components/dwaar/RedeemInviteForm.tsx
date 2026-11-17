"use client";

import { useActionState } from "react";
import { redeemInviteAction, type InviteFormState } from "@/app/apps/dwaar/actions";

// "Have an invite code?" The database says whether the code can be used.

const initialState: InviteFormState = { message: null, ok: false };

export default function RedeemInviteForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, formAction, pending] = useActionState(redeemInviteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="invite-code" className="dw-label">Have an invite code?</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="invite-code"
          name="code"
          defaultValue={initialCode}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          placeholder="8 letters or numbers"
          aria-describedby={state.message ? "invite-message" : undefined}
          className="dw-input sm:max-w-xs"
        />
        <button type="submit" disabled={pending} className="dw-btn dw-btn-quiet dw-btn-lg">
          {pending ? "Checking…" : "Use code"}
        </button>
      </div>
      {state.message && (
        <p id="invite-message" role={state.ok ? "status" : "alert"} className={`dw-alert ${state.ok ? "dw-alert-info" : "dw-alert-error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
