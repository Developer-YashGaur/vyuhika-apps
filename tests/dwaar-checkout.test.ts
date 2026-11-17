import { describe, expect, it, vi } from "vitest";
import { buildCheckoutOptions, CHECKOUT_SCRIPT_URL } from "@/lib/dwaar/checkout";

describe("buildCheckoutOptions", () => {
  const input = { keyId: "rzp_test_abc123", gatewayOrderId: "order_XYZ1", amountPaise: 9900 };

  it("uses the order, the public key and the server amount in rupees (paise)", () => {
    const o = buildCheckoutOptions(input, { onPaid: () => {}, onDismiss: () => {} });
    expect(o.key).toBe("rzp_test_abc123");
    expect(o.order_id).toBe("order_XYZ1");
    expect(o.amount).toBe(9900);
    expect(o.currency).toBe("INR");
  });
  it("wires the two callbacks", () => {
    const onPaid = vi.fn();
    const onDismiss = vi.fn();
    const o = buildCheckoutOptions(input, { onPaid, onDismiss });
    o.handler();
    o.modal.ondismiss();
    expect(onPaid).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });
  it("carries no secret or personal data", () => {
    const text = JSON.stringify(buildCheckoutOptions(input, { onPaid: () => {}, onDismiss: () => {} }));
    expect(text).not.toMatch(/secret|prefill|@|contact/i);
  });
  it("loads checkout only from Razorpay over https", () => {
    expect(CHECKOUT_SCRIPT_URL).toBe("https://checkout.razorpay.com/v1/checkout.js");
  });
});
