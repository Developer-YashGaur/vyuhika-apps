import { describe, expect, it } from "vitest";
import { monogramFor, passNumber } from "@/lib/dwaar/monogram";

describe("monogramFor", () => {
  it("uses the first letters of the first two words", () => {
    expect(monogramFor("Acme Robotics").letters).toBe("AR");
  });
  it("uses two letters for a one-word name", () => {
    expect(monogramFor("Infosys").letters).toBe("IN");
  });
  it("ignores punctuation and handles empty names", () => {
    expect(monogramFor("  ***  ").letters).toBe("?");
    expect(monogramFor("Tata & Sons").letters).toBe("TS");
  });
  it("gives the same colour for the same name, any case", () => {
    expect(monogramFor("Acme").hue).toBe(monogramFor(" acme ").hue);
    const hue = monogramFor("Zeta Labs").hue;
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});

describe("passNumber", () => {
  it("is a # followed by 4 digits and is stable", () => {
    const id = "3f2a9c10-1111-4222-8333-444455556666";
    expect(passNumber(id)).toMatch(/^#\d{4}$/);
    expect(passNumber(id)).toBe(passNumber(id));
  });
  it("does not crash on odd input", () => {
    expect(passNumber("")).toBe("#0000");
  });
});
