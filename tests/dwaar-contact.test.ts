import { describe, expect, it } from "vitest";
import { answerContact, askContact, getContactState } from "@/lib/dwaar/contact";

const db = (result: { data?: unknown; error?: { code: string } | null }) => ({ rpc: async () => ({ data: result.data ?? null, error: result.error ?? null }) }) as never;

describe("askContact", () => {
  it("says what happened for each database answer", async () => {
    expect((await askContact(db({ data: "asked" }), "r", "phone", "Ravi")).message).toMatch(/Ravi can share their phone number or decline/);
    expect((await askContact(db({ data: "pending" }), "r", "email", "Ravi")).message).toMatch(/already asked/);
    expect((await askContact(db({ data: "declined" }), "r", "email", "Ravi")).ok).toBe(false);
    expect((await askContact(db({ data: "not_allowed" }), "r", "email", "Ravi")).ok).toBe(false);
  });
  it("refuses an unknown kind and database errors", async () => {
    expect((await askContact(db({ data: "asked" }), "r", "address", "Ravi")).ok).toBe(false);
    expect((await askContact(db({ error: { code: "XX" } }), "r", "phone", "Ravi")).ok).toBe(false);
  });
});

describe("answerContact", () => {
  it("words shared, declined and the missing phone", async () => {
    expect((await answerContact(db({ data: "shared" }), "r", "phone", true)).message).toMatch(/You shared your phone number/);
    expect((await answerContact(db({ data: "declined" }), "r", "email", false)).message).toMatch(/not shared/);
    expect((await answerContact(db({ data: "no_phone" }), "r", "phone", true)).message).toMatch(/Add it in your profile/);
    expect((await answerContact(db({ data: "not_pending" }), "r", "phone", true)).ok).toBe(false);
  });
});

describe("getContactState", () => {
  it("keeps only known kinds and statuses", async () => {
    const rows = [
      { out_kind: "phone", out_status: "shared", out_value: "+919876543210", out_is_candidate: false },
      { out_kind: "fax", out_status: "shared", out_value: "x", out_is_candidate: false },
      { out_kind: "email", out_status: "weird", out_value: null, out_is_candidate: false },
    ];
    expect(await getContactState(db({ data: rows }), "r")).toEqual([{ kind: "phone", status: "shared", value: "+919876543210" }]);
  });
});
