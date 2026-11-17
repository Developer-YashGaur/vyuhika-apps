"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { spendCreditsAction } from "@/app/apps/dwaar/actions";
import { BOOST_CREDIT_COST } from "@/lib/dwaar/credit-boost";

// "Boost with credits": no payment, the credits are taken by the database. After it works, the page refreshes and
// shows the usual next step (choose your resume again so we can write the Boost).

export default function CreditBoostButton({ requestId, credits }: { requestId: string; credits: number }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false); // stops a double click

  async function spend() {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setMessage(null);
    try {
      const result = await spendCreditsAction(requestId);
      if (result.ok) router.refresh();
      else setMessage(result.message);
    } catch {
      setMessage("Something went wrong. No credits were taken. Please try again.");
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={spend} disabled={working} className="dw-btn dw-btn-primary dw-btn-sm" aria-describedby={`credit-note-${requestId}`}>
        {working ? "Working…" : `Boost with ${BOOST_CREDIT_COST} credits`}
      </button>
      <p id={`credit-note-${requestId}`} className="dw-muted mt-2 text-xs">
        A better resume, profile and LinkedIn tips. You have {credits} credits. No payment needed.
      </p>
      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {message}
      </p>
    </div>
  );
}
