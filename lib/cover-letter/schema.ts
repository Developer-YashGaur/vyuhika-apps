import { z } from "zod";
import { longTextSchema } from "@/lib/text-rules";

// The shapes of what goes into the Cover Letter Writer and what comes out of it.

export const TONES = ["professional", "friendly", "confident"] as const;
export const LENGTHS = ["short", "medium"] as const;
export type Tone = (typeof TONES)[number];
export type LetterLength = (typeof LENGTHS)[number];

// How the letter dealt with the "highlight" field (see lib/cover-letter/checks.ts).
export const HIGHLIGHT_HANDLING = ["not-provided", "used", "gap"] as const;

export const COMPANY_MAX = 100;
export const ROLE_MAX = 100;
export const HIGHLIGHT_MAX = 500;

// An optional short text field. Empty or blank counts as "not given".
function optionalText(label: string, max: number) {
  return z
    .string({ error: `Please check the ${label}.` })
    .trim()
    .max(max, { error: `Please keep the ${label} under ${max} characters.` })
    .transform((value) => value || undefined)
    .optional(); // last, so the field is truly optional in the CoverLetterInput type
}

// What the page sends. "Strict" means any field we don't expect makes the request invalid.
export const coverLetterInputSchema = z.strictObject({
  resume: longTextSchema("resume"),
  jobDescription: longTextSchema("job description"),
  companyName: optionalText("company name", COMPANY_MAX),
  roleTitle: optionalText("role title", ROLE_MAX),
  highlight: optionalText("highlight", HIGHLIGHT_MAX),
  tone: z.enum(TONES, { error: "Please pick a tone." }),
  length: z.enum(LENGTHS, { error: "Please pick a length." }),
});

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;

type InputCheck = { ok: true; input: CoverLetterInput } | { ok: false; message: string };

// Checks the request body and returns the cleaned input, or one friendly message.
export function parseCoverLetterInput(body: unknown): InputCheck {
  const checked = coverLetterInputSchema.safeParse(body);
  if (checked.success) return { ok: true, input: checked.data };

  const issue = checked.error.issues[0];
  // Unknown fields or a body that isn't an object get a general message.
  if (issue.code === "unrecognized_keys" || issue.path.length === 0) {
    return { ok: false, message: "Something in the form wasn't right. Please refresh the page and try again." };
  }
  return { ok: false, message: issue.message };
}

// The exact JSON shape we ask Gemini for, also used to check its answer.
export const coverLetterResultSchema = z.object({
  letter: z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .describe("The full cover letter as plain text, with blank lines between paragraphs."),
  gaps: z
    .array(
      z.object({
        need: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .describe("What the job asks for that the resume does not show, in a few words."),
        placeholder: z
          .string()
          .trim()
          .min(3)
          .max(200)
          .describe("The exact placeholder used in the letter for this gap, including the square brackets."),
      }),
    )
    .max(10)
    .describe("Every placeholder in the letter (except [Your name]), with what the job needs there."),
  highlightHandling: z
    .enum(HIGHLIGHT_HANDLING)
    .describe('"not-provided" if the highlight block is empty; "used" if the resume supports it; otherwise "gap".'),
  highlightEvidence: z
    .string()
    .trim()
    .max(300)
    .describe('If "used": a phrase copied exactly from the resume that supports the highlight. Otherwise an empty string.'),
});

export type CoverLetterResult = z.infer<typeof coverLetterResultSchema>;
export type CoverLetterGap = CoverLetterResult["gaps"][number];
