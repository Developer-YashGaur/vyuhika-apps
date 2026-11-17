// What the browser gives Razorpay checkout. Only public values go in here: the key id, the order id and the amount.
// The key SECRET is never available in the browser. The "handler" only shows a message: whether a payment really
// happened is decided by the server (the webhook), never by this page.

export type CheckoutInput = { keyId: string; gatewayOrderId: string; amountPaise: number };
export type CheckoutCallbacks = { onPaid: () => void; onDismiss: () => void };

export type CheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  theme: { color: string };
  handler: () => void;
  modal: { ondismiss: () => void };
};

export function buildCheckoutOptions(input: CheckoutInput, callbacks: CheckoutCallbacks): CheckoutOptions {
  return {
    key: input.keyId,
    order_id: input.gatewayOrderId,
    amount: input.amountPaise,
    currency: "INR",
    name: "Dwaar by Vyuhika",
    description: "Boost: a better resume, profile and LinkedIn tips",
    theme: { color: "#22d3ee" },
    handler: callbacks.onPaid,
    modal: { ondismiss: callbacks.onDismiss },
  };
}

export const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
