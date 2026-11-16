import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CoverLetterWriter from "@/components/cover-letter/CoverLetterWriter";
import PillGroup from "@/components/cover-letter/PillGroup";
import WriteButton from "@/components/cover-letter/WriteButton";
import { LENGTH_OPTIONS, TONE_OPTIONS } from "@/lib/cover-letter/form";

// The form's markup. The arrow keys themselves are the browser's own radio behaviour; what we check here is
// that the groups are real radio inputs with one shared name, a legend and labels, and nothing that
// would get in the browser's way. scripts/check-cover-letter-page.mjs presses the keys in a real browser.

const noop = () => {};
const text = (length: number) => "a".repeat(length);

function renderGroup(
  name: string,
  legend: string,
  options: { value: string; label: string; hint: string }[],
  value: string,
) {
  return renderToStaticMarkup(<PillGroup name={name} legend={legend} options={options} value={value} onChange={noop} />);
}

function renderButton(resume: string, job: string) {
  return renderToStaticMarkup(<WriteButton resume={resume} jobDescription={job} onWrite={noop} />);
}

describe("PillGroup", () => {
  const html = renderGroup("tone", "Tone", TONE_OPTIONS, "professional");

  it("is a fieldset with a legend, so screen readers announce the group name", () => {
    expect(html).toMatch(/^<fieldset/);
    expect(html).toContain("<legend");
    expect(html).toContain(">Tone</legend>");
  });

  it("has one real radio input per option, all sharing the group name", () => {
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html.match(/name="tone"/g)).toHaveLength(3);
    for (const { value } of TONE_OPTIONS) expect(html).toContain(`value="${value}"`);
  });

  it("wraps each input in a label with its title and one-line hint", () => {
    expect(html.match(/<label/g)).toHaveLength(3);
    for (const { label, hint } of TONE_OPTIONS) {
      expect(html).toContain(`>${label}</span>`);
      expect(html).toContain(`>${hint}</span>`);
    }
    expect(html).toContain('aria-describedby="tone-friendly-hint"');
    expect(html).toContain('id="tone-friendly-hint"');
  });

  it("checks only the chosen option", () => {
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toMatch(/value="professional"[^>]*checked=""|checked=""[^>]*value="professional"/);
  });

  it("keeps every radio in the browser's own keyboard handling", () => {
    // A tabindex on the radios would break "Tab goes to the chosen one, arrows move inside the group".
    expect(html).not.toContain("tabindex");
    expect(html).not.toContain("tabIndex");
    expect(html).not.toContain("disabled");
    // Hidden with the screen-reader-only class, never display:none or hidden (those remove it from the keyboard).
    expect(html).toContain('class="sr-only"');
    expect(html).not.toMatch(/\shidden/);
  });

  it("shows the length options and marks the chosen one", () => {
    const lengthHtml = renderGroup("length", "Length", LENGTH_OPTIONS, "medium");
    expect(lengthHtml).toContain(">Length</legend>");
    expect(lengthHtml).toContain("About 150 to 200 words");
    expect(lengthHtml).toContain("About 260 to 340 words");
    expect(lengthHtml).toMatch(/value="medium"[^>]*checked=""|checked=""[^>]*value="medium"/);
    expect(lengthHtml.match(/checked=""/g)).toHaveLength(1);
  });
});

describe("WriteButton", () => {
  const disabled = /<button[^>]*disabled=""/;

  it("is disabled until both boxes have at least 200 characters", () => {
    expect(renderButton("", "")).toMatch(disabled);
    expect(renderButton(text(199), text(300))).toMatch(disabled);
    expect(renderButton(text(300), text(199))).toMatch(disabled);
    expect(renderButton(text(200), text(200))).not.toMatch(disabled);
  });

  it("is disabled when a box is over 15,000 characters", () => {
    expect(renderButton(text(15_000), text(15_000))).not.toMatch(disabled);
    expect(renderButton(text(15_001), text(300))).toMatch(disabled);
    expect(renderButton(text(300), text(15_001))).toMatch(disabled);
  });

  it("explains the state in the hint the button points to", () => {
    expect(renderButton("", "")).toContain("Add at least 200 characters to each box to continue.");
    expect(renderButton(text(300), text(300))).toContain("Ready when you are.");
    expect(renderButton(text(15_001), text(300))).toContain("Each box can hold up to 15,000 characters.");
    expect(renderButton("", "")).toContain('aria-describedby="write-hint"');
    expect(renderButton("", "")).toContain('id="write-hint"');
  });

  it("shows the label and the privacy line", () => {
    const html = renderButton("", "");
    expect(html).toContain("Write my cover letter");
    expect(html).toContain("Your text is sent securely to an AI service to write the letter. It is not stored by Vyuhika.");
  });
});

describe("CoverLetterWriter (first screen)", () => {
  const html = renderToStaticMarkup(<CoverLetterWriter />);

  it("shows both text panels with their counters and sample links", () => {
    expect(html).toContain("Paste your resume");
    expect(html).toContain("Paste the job description");
    expect(html.match(/Load sample/g)).toHaveLength(2);
    expect(html).toContain("0 / 200 characters minimum");
    expect(html).toContain("Your file is read in your browser.");
  });

  it("shows the optional fields with their limits and counters", () => {
    expect(html).toContain("Optional details");
    expect(html).toMatch(/id="company-name"[^>]*maxLength="100"|maxLength="100"[^>]*id="company-name"/i);
    expect(html).toMatch(/id="role-title"[^>]*maxLength="100"|maxLength="100"[^>]*id="role-title"/i);
    expect(html).toMatch(/id="highlight"[^>]*maxLength="500"|maxLength="500"[^>]*id="highlight"/i);
    expect(html).toContain("0 / 100");
    expect(html).toContain("0 / 500");
    expect(html).toContain("Only things your resume shows will be used. Anything else becomes a blank for you to fill in.");
  });

  it("starts with Professional and Short chosen, and no short-resume hint for an empty resume", () => {
    expect(html).toMatch(/value="professional"[^>]*checked=""|checked=""[^>]*value="professional"/);
    expect(html).toMatch(/value="short"[^>]*checked=""|checked=""[^>]*value="short"/);
    expect(html.match(/checked=""/g)).toHaveLength(2);
    expect(html).not.toContain("Your resume is short");
  });
});
