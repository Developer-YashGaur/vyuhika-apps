import { describe, expect, it } from "vitest";
import {
  blanksLabel,
  countWords,
  downloadFilename,
  findPlaceholders,
  gapRange,
  isGapFilled,
  needsReplaceConfirm,
  nextPlaceholderRange,
  noteMessages,
  replacePanelWording,
} from "@/lib/cover-letter/result";

// The pure helpers behind the Cover Letter Writer result view.

const gap = { need: "Next.js", placeholder: "[add a real example of Next.js here]" };

describe("countWords", () => {
  it("counts words separated by any spaces or new lines", () => {
    expect(countWords("Dear Hiring Manager,\n\nI built   things.")).toBe(6);
  });

  it("is 0 for an empty or blank letter", () => {
    expect(countWords("")).toBe(0);
    expect(countWords(" \n  ")).toBe(0);
  });
});

describe("findPlaceholders", () => {
  it("finds every [placeholder] with its position", () => {
    const text = "At A I [add one here]. Then [add two here] and sign [Your name]";
    const found = findPlaceholders(text);
    expect(found.map((r) => text.slice(r.start, r.end))).toEqual(["[add one here]", "[add two here]", "[Your name]"]);
  });

  it("ignores empty brackets and brackets that run over a line break", () => {
    expect(findPlaceholders("a [] b [one\ntwo] c")).toEqual([]);
  });

  it("is empty when there are none", () => {
    expect(findPlaceholders("No blanks here.")).toEqual([]);
  });
});

describe("nextPlaceholderRange", () => {
  const text = "One [first blank] then [second blank] end [third blank]";
  const [first, second, third] = findPlaceholders(text);

  it("picks the first blank at or after the position", () => {
    expect(nextPlaceholderRange(text, 0)).toEqual(first);
    expect(nextPlaceholderRange(text, first.start)).toEqual(first);
  });

  it("moves on to the next blank when the current one is selected", () => {
    expect(nextPlaceholderRange(text, first.end)).toEqual(second);
    expect(nextPlaceholderRange(text, second.end)).toEqual(third);
  });

  it("goes back to the first blank after the last one", () => {
    expect(nextPlaceholderRange(text, third.end)).toEqual(first);
    expect(nextPlaceholderRange(text, text.length)).toEqual(first);
  });

  it("is null when there are no blanks", () => {
    expect(nextPlaceholderRange("Nothing to fill.", 0)).toBeNull();
  });
});

describe("blanksLabel", () => {
  it("shows the count, or says all blanks are filled", () => {
    expect(blanksLabel(2)).toBe("2 blanks still to fill");
    expect(blanksLabel(1)).toBe("1 blank still to fill");
    expect(blanksLabel(0)).toBe("All blanks filled");
  });
});

describe("gap filled-in detection", () => {
  it("finds the blank while it is still in the letter", () => {
    const letter = `At ShopLane I ${gap.placeholder}.`;
    expect(gapRange(letter, gap)).toEqual({ start: 14, end: 14 + gap.placeholder.length });
    expect(isGapFilled(letter, gap)).toBe(false);
  });

  it("counts a gap as filled once the blank is deleted or rewritten", () => {
    expect(isGapFilled("At ShopLane I moved the app to Next.js.", gap)).toBe(true);
    expect(gapRange("At ShopLane I moved the app to Next.js.", gap)).toBeNull();
  });
});

describe("downloadFilename", () => {
  it("slugifies the company name", () => {
    expect(downloadFilename("Nimbus Cloud")).toBe("cover-letter-nimbus-cloud.txt");
    expect(downloadFilename("  AT&T, Inc.  ")).toBe("cover-letter-at-t-inc.txt");
    expect(downloadFilename("Café Zoë")).toBe("cover-letter-cafe-zoe.txt");
  });

  it("falls back to cover-letter.txt with no usable company name", () => {
    expect(downloadFilename(undefined)).toBe("cover-letter.txt");
    expect(downloadFilename("")).toBe("cover-letter.txt");
    expect(downloadFilename("   ")).toBe("cover-letter.txt");
    expect(downloadFilename("株式会社")).toBe("cover-letter.txt");
    expect(downloadFilename("../../etc/passwd")).toBe("cover-letter-etc-passwd.txt");
  });

  it("keeps long names short and never ends with a dash", () => {
    const name = downloadFilename("A".repeat(39) + " Bbbbbbbbbb");
    expect(name).toBe(`cover-letter-${"a".repeat(39)}.txt`);
  });
});

describe("needsReplaceConfirm (Regenerate asks first only after edits)", () => {
  it("does not ask when the letter is as the AI wrote it", () => {
    expect(needsReplaceConfirm("Dear Hiring Manager,", "Dear Hiring Manager,")).toBe(false);
  });

  it("asks after any edit, even a small one", () => {
    expect(needsReplaceConfirm("Dear Hiring Manager.", "Dear Hiring Manager,")).toBe(true);
    expect(needsReplaceConfirm("Dear Hiring Manager, ", "Dear Hiring Manager,")).toBe(true);
  });
});

describe("noteMessages", () => {
  it("explains a dropped highlight", () => {
    expect(noteMessages(["highlight-not-addressed"])).toEqual([
      "Your resume doesn't show what you wanted to highlight, so we left it out. Add it to your resume, or write it in yourself.",
    ]);
  });

  it("explains a length miss", () => {
    expect(noteMessages(["length"])).toEqual([
      "This letter is a bit shorter or longer than you picked. You can edit it freely.",
    ]);
  });

  it("gives the five polish checks one shared message, once", () => {
    const polish = "A few lines may need a quick polish. Read it through once before you send it.";
    for (const name of ["placement", "opening", "cliche", "resume-mention", "placeholder-wording"]) {
      expect(noteMessages([name])).toEqual([polish]);
    }
    expect(noteMessages(["placement", "opening", "cliche", "resume-mention", "placeholder-wording"])).toEqual([polish]);
  });

  it("lists the messages in a steady order and never shows raw check names", () => {
    const all = noteMessages(["cliche", "length", "highlight-not-addressed", "opening"]);
    expect(all).toHaveLength(3);
    expect(all[0]).toContain("highlight");
    expect(all[1]).toContain("shorter or longer");
    expect(all[2]).toContain("polish");
    for (const message of all) {
      for (const name of ["highlight-not-addressed", "placement", "opening", "cliche", "resume-mention", "placeholder-wording"]) {
        expect(message).not.toContain(name);
      }
    }
  });

  it("ignores names it does not know and returns nothing for no notes", () => {
    expect(noteMessages([])).toEqual([]);
    expect(noteMessages(["something-new"])).toEqual([]);
  });
});

describe("replacePanelWording (the shared \"Replace your edits?\" panel)", () => {
  it("has its own text and confirm button for Regenerate, Edit inputs and Start over", () => {
    const wording = (["regenerate", "edit", "reset"] as const).map((action) => replacePanelWording(action));
    expect(wording.map((w) => w.confirm)).toEqual(["Replace my edits", "Edit inputs anyway", "Start over anyway"]);
    expect(new Set(wording.map((w) => w.text)).size).toBe(3);
  });

  it("only Regenerate mentions the limit, since the other two don't send a request", () => {
    expect(replacePanelWording("regenerate").text).toContain("counts toward your limit");
    expect(replacePanelWording("edit").text).not.toContain("limit");
    expect(replacePanelWording("reset").text).not.toContain("limit");
  });

  it("says plainly that edits are dropped", () => {
    for (const action of ["edit", "reset"] as const) expect(replacePanelWording(action).text).toContain("changes you made");
  });
});
