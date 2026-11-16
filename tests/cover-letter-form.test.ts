import { describe, expect, it } from "vitest";
import {
  FIELD_LIMITS,
  LENGTH_OPTIONS,
  SHORT_RESUME_CHARS,
  TONE_OPTIONS,
  canWrite,
  shouldPreselectShort,
  suggestShort,
  writeHint,
} from "@/lib/cover-letter/form";
import { COMPANY_MAX, HIGHLIGHT_MAX, LENGTHS, ROLE_MAX, TONES } from "@/lib/cover-letter/schema";
import { MAX_CHARS, MIN_CHARS } from "@/lib/text-rules";

// The pure helpers behind the Cover Letter Writer form.

const text = (length: number) => "a".repeat(length);

describe("field limits", () => {
  it("come from the schema the server uses", () => {
    expect(FIELD_LIMITS).toEqual({ company: COMPANY_MAX, role: ROLE_MAX, highlight: HIGHLIGHT_MAX });
    expect(FIELD_LIMITS).toEqual({ company: 100, role: 100, highlight: 500 });
  });
});

describe("option lists", () => {
  it("offer exactly the tones and lengths the server accepts, in order", () => {
    expect(TONE_OPTIONS.map((o) => o.value)).toEqual([...TONES]);
    expect(LENGTH_OPTIONS.map((o) => o.value)).toEqual([...LENGTHS]);
  });
});

describe("canWrite", () => {
  it("needs both boxes to have at least 200 characters", () => {
    expect(canWrite(text(MIN_CHARS), text(MIN_CHARS))).toBe(true);
    expect(canWrite(text(MIN_CHARS - 1), text(MIN_CHARS))).toBe(false);
    expect(canWrite(text(MIN_CHARS), text(MIN_CHARS - 1))).toBe(false);
    expect(canWrite("", "")).toBe(false);
  });

  it("rejects either box over 15,000 characters", () => {
    expect(canWrite(text(MAX_CHARS), text(MAX_CHARS))).toBe(true);
    expect(canWrite(text(MAX_CHARS + 1), text(MIN_CHARS))).toBe(false);
    expect(canWrite(text(MIN_CHARS), text(MAX_CHARS + 1))).toBe(false);
  });

  it("ignores spaces around the text, like the server does", () => {
    expect(canWrite(`   ${text(MIN_CHARS - 1)}   `, text(MIN_CHARS))).toBe(false);
  });
});

describe("writeHint", () => {
  it("says when the button is ready", () => {
    expect(writeHint(text(300), text(300))).toBe("Ready when you are.");
  });

  it("asks for more text when a box is too short", () => {
    expect(writeHint(text(10), text(300))).toBe("Add at least 200 characters to each box to continue.");
  });

  it("asks to shorten the text when a box is too long", () => {
    expect(writeHint(text(300), text(MAX_CHARS + 1))).toBe(
      "Each box can hold up to 15,000 characters. Please shorten the text.",
    );
  });
});

describe("suggestShort", () => {
  it("is true for a resume with some text under about 1,200 characters", () => {
    expect(suggestShort(text(1))).toBe(true);
    expect(suggestShort(text(SHORT_RESUME_CHARS - 1))).toBe(true);
  });

  it("is false for an empty box and for longer resumes", () => {
    expect(suggestShort("")).toBe(false);
    expect(suggestShort("   \n  ")).toBe(false);
    expect(suggestShort(text(SHORT_RESUME_CHARS))).toBe(false);
  });
});

describe("shouldPreselectShort", () => {
  it("fires only when the resume becomes short, so Medium can be chosen afterwards", () => {
    expect(shouldPreselectShort("", text(500))).toBe(true);
    expect(shouldPreselectShort(text(2000), text(500))).toBe(true);
    // Already short: typing more must not undo a choice of Medium.
    expect(shouldPreselectShort(text(500), text(600))).toBe(false);
    expect(shouldPreselectShort(text(500), text(2000))).toBe(false);
    expect(shouldPreselectShort(text(500), "")).toBe(false);
  });
});
