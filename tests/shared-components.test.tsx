import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import ResumeDropzone from "@/components/shared/ResumeDropzone";
import TextPanel from "@/components/shared/TextPanel";
import { AiError, type AiErrorCode } from "@/lib/ai/errors";
import { MIN_CHARS } from "@/lib/text-rules";

// The shared components show whatever text each app passes in, not Resume Matcher wording.

const noop = () => {};

const titles: Record<AiErrorCode, string> = {
  "rate-limited": "Slow down a little",
  timeout: "The letter took too long",
  "ai-failed": "We couldn't write this letter",
  offline: "No connection",
  "invalid-input": "Check your details",
};

function renderError(error: AiError) {
  return renderToStaticMarkup(
    <ErrorState error={error} titles={titles} retryLabel="Write again" editLabel="Change details" onRetry={noop} onEdit={noop} />,
  );
}

describe("LoadingState", () => {
  it("shows the first of the lines it is given", () => {
    const html = renderToStaticMarkup(<LoadingState lines={["Drafting your letter...", "Marking gaps..."]} />);
    expect(html).toContain("Drafting your letter...");
    expect(html).not.toContain("Reading your resume");
    expect(html).toContain('role="status"');
  });
});

describe("ErrorState", () => {
  it("shows the app's own title, the error message and button labels", () => {
    const html = renderError(new AiError("ai-failed", "The AI is resting. Try again soon."));
    expect(html).toContain("We couldn&#x27;t write this letter");
    expect(html).toContain("The AI is resting. Try again soon.");
    expect(html).toContain("Write again");
    expect(html).toContain("Change details");
    expect(html).not.toContain("analyze");
  });

  it("picks the title that matches the error code", () => {
    expect(renderError(new AiError("offline"))).toContain("No connection");
    expect(renderError(new AiError("timeout"))).toContain("The letter took too long");
  });

  it("hides the retry button when the input itself is wrong", () => {
    const html = renderError(new AiError("invalid-input"));
    expect(html).toContain("Check your details");
    expect(html).not.toContain("Write again");
    expect(html).toContain("Change details");
  });
});

describe("TextPanel", () => {
  it("shows the label and placeholder it is given, linked to its text box", () => {
    const html = renderToStaticMarkup(
      <TextPanel id="job" label="Paste the job post" placeholder="The full job ad..." value="" onChange={noop} onLoadSample={noop} />,
    );
    expect(html).toContain('for="job"');
    expect(html).toContain("Paste the job post");
    expect(html).toContain('placeholder="The full job ad..."');
    expect(html).toContain(`0 / ${MIN_CHARS} characters minimum`);
  });

  it("shows anything passed as children above the text box", () => {
    const html = renderToStaticMarkup(
      <TextPanel id="resume" label="Resume" placeholder="" value="" onChange={noop} onLoadSample={noop}>
        <p>Upload area</p>
      </TextPanel>,
    );
    expect(html.indexOf("Upload area")).toBeLessThan(html.indexOf("<textarea"));
  });
});

describe("ResumeDropzone", () => {
  it("shows the upload prompt when no file is loaded", () => {
    const html = renderToStaticMarkup(<ResumeDropzone fileName={null} onText={noop} onRemove={noop} />);
    expect(html).toContain("Upload resume");
    expect(html).toContain("PDF, DOCX or TXT, up to 5 MB");
  });

  it("shows the loaded file's name with a remove button", () => {
    const html = renderToStaticMarkup(<ResumeDropzone fileName="priya-cv.pdf" onText={noop} onRemove={noop} />);
    expect(html).toContain("priya-cv.pdf");
    expect(html).toContain('aria-label="Remove priya-cv.pdf"');
  });
});
