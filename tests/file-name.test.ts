import { describe, expect, it } from "vitest";
import { resumeFileName } from "@/lib/dwaar/file-name";

describe("resume PDF file name", () => {
  it("uses the person's name", () => expect(resumeFileName("Asha Rao")).toBe("Asha-Rao-Resume"));
  it("removes accents, symbols and odd spacing", () => {
    expect(resumeFileName("  José  O'Neil / Jr. ")).toBe("Jose-O-Neil-Jr-Resume");
    expect(resumeFileName("../../etc/passwd")).toBe("etc-passwd-Resume");
  });
  it("falls back when there is no usable name, and keeps it short", () => {
    expect(resumeFileName("")).toBe("My-Resume");
    expect(resumeFileName("@@@")).toBe("My-Resume");
    expect(resumeFileName("a".repeat(200)).length).toBeLessThanOrEqual(57);
  });
});
