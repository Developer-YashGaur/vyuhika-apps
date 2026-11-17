"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { confirmPlanPaymentAction, startPlanAction } from "@/app/apps/dwaar/actions";
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

export default function PlanButton({ label }: { label: string }) {
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
      const [order, scriptReady] = await Promise.all([startPlanAction(), loadCheckoutScript()]);
      const Razorpay = (window as RazorpayWindow).Razorpay;
      if (!order.ok) {
        setMessage(order.message);
        setPhase("idle");
        busy.current = false;
        return;
      }
      if (!scriptReady || !Razorpay) {
        setMessage("The payment window could not load. Check your connection and try again. Nothing was charged.");
        setPhase("idle");
        busy.current = false;
        return;
      }
      const options = buildCheckoutOptions(
        { keyId: order.keyId, gatewayOrderId: order.gatewayOrderId, amountPaise: order.amountPaise },
        {
          onPaid: async (response) => {
            setPhase("confirming");
            setMessage("Payment received. Confirming it now…");
            const confirmed = await confirmPlanPaymentAction({
              orderId: response.razorpay_order_id ?? "",
              paymentId: response.razorpay_payment_id ?? "",
              signature: response.razorpay_signature ?? "",
            });
            setMessage(confirmed.ok ? "Payment confirmed. Your Plus pass is active. Thank you!" : confirmed.message);
            setPhase("idle");
            busy.current = false;
            router.refresh();
          },
          onDismiss: () => {
            setPhase("idle");
            busy.current = false;
          },
        },
        order.description,
      );
      setPhase("open");
      new Razorpay(options).open();
    } catch {
      setMessage("Something went wrong. Nothing was charged. Please try again.");
      setPhase("idle");
      busy.current = false;
    }
  }

  return (
    <div>
      <button type="button" onClick={start} disabled={phase !== "idle"} className="dw-btn dw-btn-primary dw-btn-lg">
        {phase === "working" ? "Opening payment…" : label}
      </button>
      <p role="status" aria-live="polite" className="mt-3 text-sm">
        {message}
      </p>
    </div>
  );
}
