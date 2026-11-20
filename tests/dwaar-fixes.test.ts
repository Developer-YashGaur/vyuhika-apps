import { describe, expect, it } from "vitest";
import { pickBetterDraft, shouldTryAgain } from "@/lib/dwaar/deliver-boost";
import { buildBoostPrompt } from "@/lib/dwaar/boost-writer";
import { matchCompanyId } from "@/lib/dwaar/jobs";

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
