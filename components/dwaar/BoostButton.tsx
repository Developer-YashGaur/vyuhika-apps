"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { confirmBoostPaymentAction, startBoostAction } from "@/app/apps/dwaar/actions";
import { buildCheckoutOptions, CHECKOUT_SCRIPT_URL } from "@/lib/dwaar/checkout";

type RazorpayWindow = Window & { Razorpay?: new (options: unknown) => { open: () => void } };
type Phase = "idle" | "working" | "open" | "confirming";

// Loads Razorpay's checkout script once, only when the person clicks.
function loadCheckoutScript(): Promise<boolean> {
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BoostButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false); // stops a double click from starting two checkouts

  async function start() {
    if (busy.current) return;
    busy.current = true;
    setMessage(null);
    setPhase("working");
    try {
      const [order, scriptReady] = await Promise.all([startBoostAction(requestId), loadCheckoutScript()]);
      const Razorpay = (window as RazorpayWindow).Razorpay;
      if (!order.ok) {
        setMessage(order.message);
        setPhase("idle");
        return;
      }
      if (!scriptReady || !Razorpay) {
        setMessage("The payment window could not load. Check your connection and try again. Nothing was charged.");
        setPhase("idle");
        return;
      }
      const options = buildCheckoutOptions(order, {
        onPaid: async (response) => {
          setPhase("confirming");
          setMessage("Payment received. Confirming it now…");
          const confirmed = await confirmBoostPaymentAction({
            orderId: response.razorpay_order_id ?? "",
            paymentId: response.razorpay_payment_id ?? "",
            signature: response.razorpay_signature ?? "",
          });
          setMessage(confirmed.ok ? "Payment confirmed. Thank you!" : confirmed.message);
          router.refresh();
        },
        onDismiss: () => {
          setPhase("idle");
          busy.current = false;
        },
      });
      setPhase("open");
      new Razorpay(options).open();
    } catch {
      setMessage("Something went wrong. Nothing was charged. Please try again.");
      setPhase("idle");
    } finally {
      if (phase !== "open") busy.current = false;
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={start} disabled={phase !== "idle"} className="dw-btn dw-btn-primary dw-btn-sm" aria-describedby={`boost-note-${requestId}`}>
        {phase === "working" ? "Opening payment…" : "Boost this request"}
      </button>
      <p id={`boost-note-${requestId}`} className="dw-muted mt-2 text-xs">
        A paid extra: a better resume, profile and LinkedIn tips. You see the price before you pay.
      </p>
      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {message}
      </p>
    </div>
  );
}
