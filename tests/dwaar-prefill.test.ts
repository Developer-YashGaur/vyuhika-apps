import { describe, expect, it } from "vitest";
import { readPrefill, savePrefill } from "@/lib/dwaar/prefill";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe("prefill", () => {
  it("hands over the description once, for the same link only", () => {
    const s = memory();
    savePrefill("https://a.example/1", "Job text", s);
    expect(readPrefill("https://a.example/2", s)).toBe("");
    expect(readPrefill("https://a.example/1", s)).toBe("Job text");
    expect(readPrefill("https://a.example/1", s)).toBe("");
  });
  it("ignores broken or missing storage", () => {
    const s = memory();
    s.setItem("dwaar-prefill", "{not json");
    expect(readPrefill("https://a.example/1", s)).toBe("");
    expect(readPrefill(undefined, s)).toBe("");
    expect(readPrefill("https://a.example/1", null)).toBe("");
  });
});
