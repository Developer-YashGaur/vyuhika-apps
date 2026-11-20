import { describe, expect, it } from "vitest";
import { pickBetterDraft, shouldTryAgain } from "@/lib/dwaar/deliver-boost";
import { buildBoostPrompt } from "@/lib/dwaar/boost-writer";
import { matchCompanyId } from "@/lib/dwaar/jobs";
import { listMyBoosts } from "@/lib/dwaar/boost";
import { spendCreditsOnBoost, spendMessage } from "@/lib/dwaar/credit-boost";
import { friendlyRequestError } from "@/lib/dwaar/requests";
import { friendlyRespondError } from "@/lib/dwaar/inbox";

const draft = (name: string) => ({ improvedResume: name, summary: "", changes: [], profileTips: [], linkedinTips: [] });

describe("pickBetterDraft", () => {
  it("takes the first draft when there is none yet", () => {
    expect(pickBetterDraft(null, { draft: draft("a"), score: 50 }).draft.improvedResume).toBe("a");
  });
  it("keeps the higher score", () => {
    const best = pickBetterDraft({ draft: draft("a"), score: 47 }, { draft: draft("b"), score: 70 });
    expect(best.draft.improvedResume).toBe("b");
    expect(pickBetterDraft({ draft: draft("a"), score: 70 }, { draft: draft("b"), score: 47 }).draft.improvedResume).toBe("a");
  });
  it("keeps the first on a tie, and prefers a scored draft to an unscored one", () => {
    expect(pickBetterDraft({ draft: draft("a"), score: 60 }, { draft: draft("b"), score: 60 }).draft.improvedResume).toBe("a");
    expect(pickBetterDraft({ draft: draft("a"), score: null }, { draft: draft("b"), score: 10 }).draft.improvedResume).toBe("b");
    expect(pickBetterDraft({ draft: draft("a"), score: 10 }, { draft: draft("b"), score: null }).draft.improvedResume).toBe("a");
  });
});

describe("shouldTryAgain", () => {
  it("tries again only when the best draft does not beat the original", () => {
    expect(shouldTryAgain(61, 47)).toBe(true);
    expect(shouldTryAgain(61, 61)).toBe(true);
    expect(shouldTryAgain(61, 75)).toBe(false);
  });
  it("does not try again when a score is unknown", () => {
    expect(shouldTryAgain(null, 40)).toBe(false);
    expect(shouldTryAgain(60, null)).toBe(false);
  });
});

describe("buildBoostPrompt", () => {
  const base = { resume: "R", jobTitle: "T", company: "C", jobDescription: "J" };
  it("lists the words to keep", () => {
    expect(buildBoostPrompt({ ...base, keepWords: ["Python", "SQL"] })).toContain("Keep every one of them in the rewrite: Python, SQL.");
  });
  it("adds nothing when there are none", () => {
    expect(buildBoostPrompt(base)).not.toContain("Keep every one");
  });
});

describe("matchCompanyId", () => {
  const list = [{ id: "1", name: "Infosys" }, { id: "2", name: "Tata Consultancy Services" }, { id: "3", name: "Acme Pvt Ltd" }];
  it("matches ignoring capitals, spaces and endings", () => {
    expect(matchCompanyId("INFOSYS Ltd.", list)).toBe("1");
    expect(matchCompanyId("Acme", list)).toBe("3");
    expect(matchCompanyId("tata consultancy  services", list)).toBe("2");
  });
  it("does not guess", () => {
    expect(matchCompanyId("Info", list)).toBe("");
    expect(matchCompanyId("", list)).toBe("");
    expect(matchCompanyId("Acme", [{ id: "a", name: "Acme Inc" }, { id: "b", name: "Acme LLC" }])).toBe("");
  });
});

describe("suspended accounts", () => {
  it("get a clear message instead of a generic error", () => {
    expect(friendlyRequestError("DW060")).toContain("suspended");
    expect(friendlyRespondError("DW060")).toContain("suspended");
  });
});

function boostDb(rows: unknown[]) {
  const chain = { select: () => chain, in: () => chain, order: async () => ({ data: rows, error: null }) };
  return { from: () => chain } as never;
}

describe("listMyBoosts", () => {
  it("counts finished Boosts and shows the newest finished one", async () => {
    const boosts = await listMyBoosts(boostDb([
      { id: "o3", request_id: "r1", status: "delivered" },
      { id: "o2", request_id: "r1", status: "delivered" },
      { id: "o1", request_id: "r1", status: "delivered" },
      { id: "p1", request_id: "r2", status: "paid" },
    ]));
    expect(boosts.get("r1")).toEqual({ orderId: "o3", status: "delivered", count: 3 });
    expect(boosts.get("r2")).toEqual({ orderId: "p1", status: "paid", count: 0 });
  });
  it("puts a Boost that is waiting for the resume first", async () => {
    const boosts = await listMyBoosts(boostDb([
      { id: "w", request_id: "r1", status: "paid" },
      { id: "d", request_id: "r1", status: "delivered" },
    ]));
    expect(boosts.get("r1")).toEqual({ orderId: "w", status: "paid", count: 1 });
  });
});

describe("spending credits on a repeat Boost", () => {
  it("knows the 5-Boost limit", async () => {
    const db = { rpc: async () => ({ data: null, error: { code: "DW035" } }) } as never;
    const result = await spendCreditsOnBoost(db, "r1");
    expect(result).toEqual({ kind: "limit" });
    expect(spendMessage("limit")).toContain("5 Boosts");
  });
});
