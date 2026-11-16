import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Where the events are fired. The wrapper is faked, so nothing is counted or sent. Rendering a page fires nothing
// (events only follow an action), and each call sits right after the success it describes, with fixed words only.

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/analytics")>()), trackEvent: (...args: unknown[]) => trackEvent(...args) }));
vi.mock("@/lib/feedback/debug-store", () => ({
  setFeedbackDebug: vi.fn(),
  setLetterFeedbackDebug: vi.fn(),
  updateLetterBlanks: vi.fn(),
  useFeedbackDebug: () => null,
  useLetterFeedbackDebug: () => null,
}));

const { default: ResumeMatcher } = await import("@/components/resume-matcher/ResumeMatcher");
const { default: CoverLetterWriter } = await import("@/components/cover-letter/CoverLetterWriter");
const { default: FeedbackWidget } = await import("@/components/feedback/FeedbackWidget");
const { default: AppGrid } = await import("@/components/AppGrid");
const { default: ResumeDropzone } = await import("@/components/shared/ResumeDropzone");

beforeEach(() => {
  trackEvent.mockClear();
});
const read = (file: string) => readFileSync(file, "utf8");

describe("rendering fires no events", () => {
  it("none of the pages or widgets count anything just by being shown", () => {
    renderToStaticMarkup(<ResumeMatcher />);
    renderToStaticMarkup(<CoverLetterWriter />);
    renderToStaticMarkup(<FeedbackWidget />);
    renderToStaticMarkup(<AppGrid />);
    renderToStaticMarkup(<ResumeDropzone fileName={null} onText={() => {}} onRemove={() => {}} />);
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

describe("each event is fired at the right moment, with fixed words only", () => {
  it("resume_analyzed: right after a successful analysis, not in the error path", () => {
    const code = read("components/resume-matcher/ResumeMatcher.tsx");
    const call = 'trackEvent("resume_analyzed", { app: "resume-matcher" })';
    expect(code.split(call)).toHaveLength(2); // exactly one call
    const afterSuccess = code.indexOf('setStep("results");');
    expect(code.indexOf(call)).toBeGreaterThan(afterSuccess);
    expect(code.indexOf(call)).toBeLessThan(code.indexOf("} catch (err)", afterSuccess)); // inside the try
  });

  it("cover_letter_written: after the letter arrives (first write and Regenerate), with tone and length only", () => {
    const code = read("components/cover-letter/CoverLetterWriter.tsx");
    const call = 'trackEvent("cover_letter_written", { app: "cover-letter-writer", tone, length })';
    expect(code.split(call)).toHaveLength(2);
    expect(code.indexOf(call)).toBeGreaterThan(code.indexOf("await requestCoverLetter("));
    expect(code).toContain("regenerate={requestLetter}"); // Regenerate goes through the same counted function
  });

  it("feedback_sent: after sendFeedback succeeded, with the type and a fixed page word (never the message or the address)", () => {
    const code = read("components/feedback/FeedbackWidget.tsx");
    const call = 'trackEvent("feedback_sent", { type, page: pageName(path) })';
    expect(code.split(call)).toHaveLength(2);
    expect(code.indexOf(call)).toBeGreaterThan(code.indexOf("await sendFeedback("));
    expect(code.indexOf(call)).toBeLessThan(code.indexOf("} catch (err)", code.indexOf(call)));
  });

  it("external_app_clicked: on the external card's link only, with the app's slug", () => {
    const code = read("components/AppCard.tsx");
    expect(code.split('trackEvent("external_app_clicked", { app: app.slug })')).toHaveLength(3); // click and middle click
    expect(code.indexOf("external_app_clicked")).toBeGreaterThan(code.indexOf("{...externalLinkProps}"));
    const internalLink = code.slice(code.indexOf("<Link"), code.indexOf("</Link>"));
    expect(internalLink).not.toContain("trackEvent");
  });

  it("resume_file_selected: after the file was read, with the file type only", () => {
    const code = read("components/shared/ResumeDropzone.tsx");
    const call = 'trackEvent("resume_file_selected", { file_type: kind })';
    expect(code.split(call)).toHaveLength(2);
    expect(code.indexOf(call)).toBeGreaterThan(code.indexOf("await readResumeFile(file)"));
    expect(code).toContain("const kind = getFileKind(file)"); // pdf, docx or txt, never file.name
  });

  it("every trackEvent call in the app is one of these exact calls: fixed words, state like tone or type, or a slug", () => {
    const allowedCalls = [
      'trackEvent("resume_analyzed", { app: "resume-matcher" })',
      'trackEvent("cover_letter_written", { app: "cover-letter-writer", tone, length })',
      'trackEvent("feedback_sent", { type, page: pageName(path) })',
      'trackEvent("external_app_clicked", { app: app.slug })', // on click, and again on middle click
      'trackEvent("resume_file_selected", { file_type: kind })',
    ];
    const files = [
      "components/resume-matcher/ResumeMatcher.tsx",
      "components/cover-letter/CoverLetterWriter.tsx",
      "components/feedback/FeedbackWidget.tsx",
      "components/AppCard.tsx",
      "components/shared/ResumeDropzone.tsx",
    ];
    let found = 0;
    for (const file of files) {
      let code = read(file).replace(/import \{[^}]*\} from "@\/lib\/analytics";\n/, "");
      for (const call of allowedCalls) {
        found += code.split(call).length - 1;
        code = code.split(call).join("");
      }
      expect(code, `${file} has a trackEvent call that is not on the list`).not.toContain("trackEvent(");
    }
    expect(found).toBe(6); // 5 events; the external one fires on click and on middle click
  });
});
