"use client";

import { useActionState } from "react";
import { reportOutcomeAction, type OutcomeState } from "@/app/apps/dwaar/actions";
import type { Outcome } from "@/lib/dwaar/earnings";

// "How did it go?" for an accepted request. Saying so is optional; it also thanks the employee with credits.
export default function OutcomeButtons({ requestId, initial }: { requestId: string; initial: Outcome }) {
  const [state, formAction, pending] = useActionState(reportOutcomeAction.bind(null, requestId), { message: null, outcome: initial } as OutcomeState);
  const done = state.outcome;
  return (
    <form action={formAction} className="grid gap-2">
      <p className="text-sm font-medium">How did it go?</p>
      <div className="flex flex-wrap gap-2">
        {done !== "offer" && done !== "interview" && (
          <button type="submit" name="outcome" value="interview" className="dw-btn dw-btn-quiet dw-btn-sm" disabled={pending}>
            I got an interview
          </button>
        )}
        {done !== "offer" && (
          <button type="submit" name="outcome" value="offer" className="dw-btn dw-btn-quiet dw-btn-sm" disabled={pending}>
            I got an offer
          </button>
        )}
      </div>
      {done && (
        <p className="dw-muted text-sm">
          {done === "offer" ? "Congratulations on your offer." : "Marked: you got an interview."}
        </p>
      )}
      {state.message && (
        <p role="status" className="dw-muted text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
