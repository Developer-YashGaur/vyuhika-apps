import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoverLetterWriter from "@/components/cover-letter/CoverLetterWriter";
import LetterResult from "@/components/cover-letter/LetterResult";
import type { CoverLetterResponse } from "@/lib/cover-letter/client";
import { setFeedbackDebug } from "@/lib/feedback/debug-store";
import { NEXT_JS_GAP, valid } from "./fixtures/cover-letter";

// The result view's markup, and a proof that this page sends nothing to the feedback store or to any log.

vi.mock("@/lib/feedback/debug-store", () => ({
  setFeedbackDebug: vi.fn(),
  useFeedbackDebug: () => null,
}));

const noop = () => {};
const answer: CoverLetterResponse = { ...valid, notes: [] };

function render(over: Partial<CoverLetterResponse> = {}, props: { companyName?: string } = {}) {
  return renderToStaticMarkup(
    <LetterResult
      initial={{ ...answer, ...over }}
      tone="friendly"
      length="medium"
      companyName={props.companyName ?? "Nimbus Cloud"}
      filled={{ company: true, role: false, highlight: false }}
      regenerate={async () => answer}
      onEdit={noop}
      onReset={noop}
    />,
  );
}

describe("LetterResult", () => {
  it("shows the draft reminder, the chosen tone and length, and the letter in an editable box", () => {
    const html = render();
    expect(html).toContain("Check every fact before you send.");
    expect(html).toContain("This letter is a draft written from your resume.");
    expect(html).toContain("Friendly tone");
    expect(html).toContain("Medium length");
    expect(html).toMatch(/<textarea[^>]*id="letter-text"/);
    expect(html).not.toMatch(/<textarea[^>]*readOnly/i);
    expect(html).toContain("Dear Hiring Manager,");
    expect(html).toMatch(/\d+ words/);
  });

  it("shows how many blanks are left and a Next blank button", () => {
    const html = render();
    expect(html).toContain("1 blank still to fill");
    expect(html).toMatch(/<button[^>]*>Next blank<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Next blank/);

    const filled = render({ letter: "Dear Hiring Manager,\n\nI moved the app to Next.js.", gaps: valid.gaps });
    expect(filled).toContain("All blanks filled");
    expect(filled).toMatch(/<button[^>]*disabled=""[^>]*>Next blank<\/button>/);
  });

  it("keeps Copy and Download enabled while blanks are left", () => {
    const html = render();
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Copy<\/button>/);
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Download \.txt<\/button>/);
    for (const label of ["Regenerate", "Edit inputs", "Start over"]) expect(html).toContain(`>${label}</button>`);
  });

  it("lists a card per gap with what the job asks for and the blank text", () => {
    const html = render();
    expect(html).toContain("Gaps to fill");
    expect(html).toContain("Next.js or a server-rendered framework");
    expect(html).toContain(NEXT_JS_GAP.replace(/'/g, "&#x27;"));
    expect(html).toContain("Blanks are things the job asks for that your resume doesn&#x27;t show. Add a real example, or delete the sentence.");
  });

  it("says Filled in on a card whose blank was deleted, and disables it", () => {
    const html = render({ letter: "Dear Hiring Manager,\n\nI moved the app to Next.js." });
    expect(html).toContain("Filled in");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*class="gap-card"|<button[^>]*class="gap-card"[^>]*disabled=""/);
  });

  it("shows friendly note messages and never a raw check name", () => {
    const html = render({ notes: ["highlight-not-addressed", "length", "cliche", "placement"] });
    expect(html).toContain("so we left it out");
    expect(html).toContain("a bit shorter or longer than you picked");
    expect(html).toContain("A few lines may need a quick polish.");
    expect(html.match(/quick polish/g)).toHaveLength(1);
    for (const name of ["highlight-not-addressed", "cliche", "placement"]) expect(html).not.toContain(name);
  });

  it("shows no notes box when there are no notes, and no confirm panel or error at the start", () => {
    const html = render();
    expect(html).not.toContain("quick polish");
    expect(html).not.toContain("Replace your edits?");
    expect(html).not.toContain('role="alert"');
  });
});

describe("privacy: the page puts only a safe summary in the feedback store, and logs nothing", () => {
  beforeEach(() => vi.mocked(setFeedbackDebug).mockClear());

  it("never uses the Resume Matcher's slot of the feedback store", () => {
    render({ notes: ["length"] });
    renderToStaticMarkup(<CoverLetterWriter />);
    expect(setFeedbackDebug).not.toHaveBeenCalled();
  });

  // The files that talk to the feedback store. Every other file in the app must not mention it.
  const STORE_USERS = [
    "components/cover-letter/CoverLetterWriter.tsx",
    "components/cover-letter/LetterResult.tsx",
    "lib/cover-letter/feedback.ts",
  ];

  it("only the three store files mention feedback, and they only store null or the built summary", () => {
    const files = [
      ...readdirSync("components/cover-letter").map((f) => `components/cover-letter/${f}`),
      "lib/cover-letter/client.ts",
      "lib/cover-letter/form.ts",
      "lib/cover-letter/result.ts",
      ...STORE_USERS.filter((f) => f.startsWith("lib/")),
    ];
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const file of new Set(files)) {
      const code = readFileSync(file, "utf8");
      if (!STORE_USERS.includes(file)) expect(code, `${file} must not use the feedback store`).not.toMatch(/feedback/i);
      expect(code, `${file} must not log`).not.toMatch(/console\.|\bfetch\(|sendBeacon|gtag/);
      // Visitor counting is allowed in one place only: CoverLetterWriter counts a written letter, with the tone and
      // length (fixed words) and nothing else. tests/analytics-call-sites.test.tsx checks that exact call.
      const withoutAllowedCount = code
        .replace('import { trackEvent } from "@/lib/analytics";\n', "")
        .replace('trackEvent("cover_letter_written", { app: "cover-letter-writer", tone, length });', "");
      const countingAllowed = file === "components/cover-letter/CoverLetterWriter.tsx";
      expect(countingAllowed ? withoutAllowedCount : code, `${file} must not count visitors`).not.toMatch(/analytics|trackEvent/);
      expect(code, `${file} must not use the matcher's slot`).not.toMatch(/\bsetFeedbackDebug\(/);
      for (const call of code.matchAll(/setLetterFeedbackDebug\(\s*([A-Za-z]+)/g)) {
        expect(["null", "buildLetterFeedbackDebug"], `${file}: ${call[0]}`).toContain(call[1]);
      }
      for (const call of code.matchAll(/updateLetterBlanks\(\s*([a-z.A-Z]+)/g)) {
        expect(call[1], `${file}: ${call[0]}`).toMatch(/^blanks(\.length)?$/);
      }
    }
  });
});
