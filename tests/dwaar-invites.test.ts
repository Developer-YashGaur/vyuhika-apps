import { describe, expect, it } from "vitest";
import { INVITE_MESSAGES, getInviteSummary, inviteLink, normalizeCode, redeemInvite } from "@/lib/dwaar/invites";
import { inviteRewardsEnabled } from "@/lib/dwaar/features";

function fakeDb(replies: Record<string, { data: unknown; error: { code?: string } | null }>) {
  const calls: { name: string; args: unknown }[] = [];
  return { calls, db: { rpc: async (name: string, args: unknown) => (calls.push({ name, args }), replies[name]) } as never };
}

describe("normalizeCode", () => {
  it("lowercases and drops spaces and dashes", () => {
    expect(normalizeCode("  AB12-cd34 ")).toBe("ab12cd34");
  });
  it("gives an empty string for non-text", () => {
    expect(normalizeCode(undefined)).toBe("");
    expect(normalizeCode(42)).toBe("");
  });
});

describe("inviteLink", () => {
  it("points to the Dwaar home page with the code", () => {
    expect(inviteLink("ab12cd34")).toBe("https://apps.vyuhika.com/apps/dwaar?invite=ab12cd34");
  });
});

describe("redeemInvite", () => {
  it("asks for a code when empty and does not call the database", async () => {
    const { db, calls } = fakeDb({});
    expect(await redeemInvite(db, "  ")).toEqual({ ok: false, message: INVITE_MESSAGES.empty });
    expect(calls).toHaveLength(0);
  });
  it("refuses a code of the wrong length without calling the database", async () => {
    const { db, calls } = fakeDb({});
    expect((await redeemInvite(db, "abc")).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
  it("sends the cleaned code and says ok", async () => {
    const { db, calls } = fakeDb({ dwaar_use_invite: { data: "ok", error: null } });
    expect(await redeemInvite(db, " AB12CD34 ")).toEqual({ ok: true, message: INVITE_MESSAGES.ok });
    expect(calls[0].args).toEqual({ p_code: "ab12cd34" });
  });
  it("turns each database answer into a sentence", async () => {
    for (const status of ["off", "bad_code", "own_code", "already", "too_late"] as const) {
      const { db } = fakeDb({ dwaar_use_invite: { data: status, error: null } });
      expect(await redeemInvite(db, "ab12cd34")).toEqual({ ok: false, message: INVITE_MESSAGES[status] });
    }
  });
  it("handles errors and unknown answers", async () => {
    expect((await redeemInvite(fakeDb({ dwaar_use_invite: { data: null, error: { code: "x" } } }).db, "ab12cd34")).message).toBe(INVITE_MESSAGES.failed);
    expect((await redeemInvite(fakeDb({ dwaar_use_invite: { data: "weird", error: null } }).db, "ab12cd34")).message).toBe(INVITE_MESSAGES.failed);
  });
});

describe("getInviteSummary", () => {
  it("returns the code and the credits", async () => {
    const { db } = fakeDb({ dwaar_my_invite_code: { data: "ab12cd34", error: null }, dwaar_credit_balance: { data: 3, error: null } });
    expect(await getInviteSummary(db)).toEqual({ code: "ab12cd34", credits: 3 });
  });
  it("returns null when something fails", async () => {
    const { db } = fakeDb({ dwaar_my_invite_code: { data: null, error: { code: "x" } }, dwaar_credit_balance: { data: 0, error: null } });
    expect(await getInviteSummary(db)).toBe(null);
  });
});

describe("inviteRewardsEnabled", () => {
  it("is off unless DWAAR_INVITES_ENABLED is true", () => {
    expect(inviteRewardsEnabled({})).toBe(false);
    expect(inviteRewardsEnabled({ DWAAR_INVITES_ENABLED: "yes" })).toBe(false);
    expect(inviteRewardsEnabled({ DWAAR_INVITES_ENABLED: " TRUE " })).toBe(true);
  });
});
