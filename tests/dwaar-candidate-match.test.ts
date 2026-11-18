import { describe, expect, it } from "vitest";
import { getCandidateMatches, matchBand } from "@/lib/dwaar/candidate-match";

const db = (rows: unknown[] | null, error: { code: string } | null = null) => ({ rpc: async () => ({ data: rows, error }) }) as never;

describe("what an employee sees about a candidate's match", () => {
  it("names the match: strong, good or partial", () => {
    expect(matchBand(82).label).toBe("Strong match");
    expect(matchBand(65).label).toBe("Good match");
    expect(matchBand(40).label).toBe("Partial match");
  });
  it("returns the score, the sentence and the skill lists, keeping only text", async () => {
    const rows = [{ out_request_id: "r1", out_score: 82, out_summary: "Strong Python match.", out_strengths: ["Python", 5, null], out_gaps: ["Kubernetes"] }];
    const map = await getCandidateMatches(db(rows), ["r1"]);
    expect(map.get("r1")).toEqual({ score: 82, summary: "Strong Python match.", matched: ["Python"], missing: ["Kubernetes"] });
  });
  it("shows nothing, without breaking the page, when the database refuses or fails", async () => {
    expect((await getCandidateMatches(db(null, { code: "42501" }), ["r1"])).size).toBe(0);
    expect((await getCandidateMatches(db([]), [])).size).toBe(0);
    expect((await getCandidateMatches(db([{ out_request_id: "r1", out_score: null }]), ["r1"])).size).toBe(0);
  });
});
