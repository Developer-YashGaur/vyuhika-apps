import { describe, expect, it } from "vitest";
import { creditWays } from "@/lib/dwaar/credits-info";

describe("credits page: every option is listed, locked ones say why", () => {
  it("everything off: all options are still shown, none available, each with a reason", () => {
    const { earn, spend } = creditWays({ invites: false, plan: false, boost: false });
    const all = [...earn, ...spend];
    expect(all.map((w) => w.id)).toEqual(["invite", "plus", "boost"]);
    for (const way of all) {
      expect(way.available).toBe(false);
      expect(typeof way.reason).toBe("string");
    }
  });
  it("an option that is on has no reason text", () => {
    const { earn } = creditWays({ invites: true, plan: false, boost: false });
    expect(earn[0].available).toBe(true);
    expect(earn[0].reason).toBe(null);
    expect(earn[1].available).toBe(false);
  });
  it("credits can be used once any way to get them is open", () => {
    expect(creditWays({ invites: true, plan: false, boost: false }).spend[0].available).toBe(true);
    expect(creditWays({ invites: false, plan: true, boost: false }).spend[0].available).toBe(true);
  });
});
