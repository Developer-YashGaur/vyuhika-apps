import { afterEach, describe, expect, it } from "vitest";
import { SEVERITY } from "@/lib/cover-letter/checks";
import { NOTE_NAMES, buildLetterFeedbackDebug, pickLetterDebugInfo } from "@/lib/cover-letter/feedback";
import {
  getFeedbackDebug,
  getLetterFeedbackDebug,
  setFeedbackDebug,
  setLetterFeedbackDebug,
  updateLetterBlanks,
} from "@/lib/feedback/debug-store";
import type { LetterFeedbackDebug } from "@/lib/feedback/rules";
import { NEXT_JS_GAP, valid } from "./fixtures/cover-letter";

// The safe summary the cover letter page may put in the shared feedback store, and the store's life cycle.

const summary: LetterFeedbackDebug = {
  tone: "confident",
  length: "medium",
  wordCount: 290,
  blanks: 1,
  companyFilled: true,
  roleFilled: true,
  highlightFilled: false,
  highlightHandling: "not-provided",
  notes: [],
};

afterEach(() => {
  setLetterFeedbackDebug(null);
  setFeedbackDebug(null);
});

describe("buildLetterFeedbackDebug", () => {
  const input = {
    tone: "friendly" as const,
    length: "medium" as const,
    letter: valid.letter,
    filled: { company: true, role: false, highlight: true },
    highlightHandling: "gap" as const,
    notes: ["length", "cliche"],
  };

  it("counts words and blanks at that moment", () => {
    const built = buildLetterFeedbackDebug(input);
    expect(built.wordCount).toBe(valid.letter.trim().split(/\s+/).length);
    expect(built.blanks).toBe(1); // the one placeholder in the sample letter
    expect(buildLetterFeedbackDebug({ ...input, letter: "No blanks here." }).blanks).toBe(0);
    expect(buildLetterFeedbackDebug({ ...input, letter: "A [one] and [two] and [Your name]" }).blanks).toBe(3);
  });

  it("copies the settings and the yes/no answers", () => {
    expect(buildLetterFeedbackDebug(input)).toMatchObject({
      tone: "friendly",
      length: "medium",
      companyFilled: true,
      roleFilled: false,
      highlightFilled: true,
      highlightHandling: "gap",
      notes: ["length", "cliche"],
    });
  });

  it("holds only the allowed fields, and no text from the letter or the inputs", () => {
    const built = buildLetterFeedbackDebug(input);
    expect(Object.keys(built).sort()).toEqual(
      [
        "blanks",
        "companyFilled",
        "highlightFilled",
        "highlightHandling",
        "length",
        "notes",
        "roleFilled",
        "tone",
        "wordCount",
      ].sort(),
    );
    const json = JSON.stringify(built);
    expect(json).not.toContain(NEXT_JS_GAP);
    expect(json).not.toContain("Dear Hiring Manager");
    expect(json).not.toContain("ShopLane");
    for (const name of ["letter", "resume", "jobDescription", "highlightEvidence", "companyName", "roleTitle", "gaps"]) {
      expect(Object.keys(built)).not.toContain(name);
    }
  });

  it("keeps only known note names, in a fixed order, without repeats", () => {
    const built = buildLetterFeedbackDebug({ ...input, notes: ["cliche", "something else", "length", "length", "Dear Hiring Manager"] });
    expect(built.notes).toEqual(["length", "cliche"]);
  });

  it("the note names are exactly the server's style (should-pass) checks", () => {
    const style = Object.entries(SEVERITY)
      .filter(([, severity]) => severity === "should")
      .map(([name]) => name);
    expect([...NOTE_NAMES].sort()).toEqual(style.sort());
  });
});

describe("pickLetterDebugInfo", () => {
  it("copies only the allowed fields, so nothing else on the object can slip through", () => {
    const sneaky = { ...summary, letter: "secret", highlightEvidence: "secret", gaps: [{ need: "x" }] };
    const picked = pickLetterDebugInfo(sneaky);
    expect(picked).toEqual(summary);
    expect("letter" in picked).toBe(false);
    expect("gaps" in picked).toBe(false);
    expect("highlightEvidence" in picked).toBe(false);
  });

  it("copies the notes array", () => {
    const notes = ["length"];
    const picked = pickLetterDebugInfo({ ...summary, notes });
    expect(picked.notes).not.toBe(notes);
  });
});

const current = getLetterFeedbackDebug;

describe("feedback store life cycle (letter slot)", () => {
  it("can be read after set, updated for blanks, and cleared", () => {
    expect(current()).toBeNull();
    setLetterFeedbackDebug(summary);
    expect(current()).toEqual(summary);
    updateLetterBlanks(0);
    expect(current()).toEqual({ ...summary, blanks: 0 });
    setLetterFeedbackDebug(null);
    expect(current()).toBeNull();
  });

  it("updating blanks does nothing when nothing is stored", () => {
    updateLetterBlanks(4);
    expect(current()).toBeNull();
  });

  it("stores a copy, not the object it was given", () => {
    const given = { ...summary, notes: ["length"] };
    setLetterFeedbackDebug(given);
    given.notes.push("cliche");
    given.blanks = 99;
    expect(current()).toEqual({ ...summary, notes: ["length"] });
  });

  it("drops extra fields before storing", () => {
    setLetterFeedbackDebug({ ...summary, letter: "secret" } as LetterFeedbackDebug);
    expect(Object.keys(current() ?? {})).not.toContain("letter");
  });

  it("keeps the Resume Matcher's slot separate", () => {
    setFeedbackDebug({ score: 50, summary: "s", matchedKeywords: [], missingKeywords: [] });
    setLetterFeedbackDebug(summary);
    setFeedbackDebug(null);
    expect(current()).toEqual(summary);
    expect(getFeedbackDebug()).toBeNull();
  });
});
