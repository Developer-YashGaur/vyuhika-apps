import { z } from "zod";
import {
  EMAIL_MAX,
  FEEDBACK_TYPES,
  COVER_LETTER_PATH,
  MESSAGE_MAX,
  MESSAGE_MIN,
  type FeedbackDebug,
  type FeedbackType,
  type LetterFeedbackDebug,
} from "@/lib/feedback/rules";
import { checkDebug, clean, feedbackPage } from "@/lib/feedback/pages";

// Server-side check of a feedback request. Every object is "strict": any field we don't
// expect (like `resume` or `jobDescription`) makes the whole request invalid.
// The optional `debug` block is checked against the schema of the page it was sent from (lib/feedback/pages.ts).

export const feedbackSchema = z.strictObject({
  type: z.enum(FEEDBACK_TYPES.map((t) => t.value) as [FeedbackType, ...FeedbackType[]]),
  message: clean(MESSAGE_MAX).pipe(z.string().min(MESSAGE_MIN)),
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX)
    .transform((v) => v || undefined)
    .pipe(z.email().optional())
    .optional(),
  website: z.string().max(200).optional(), // honeypot: real people never fill this in
  context: z.strictObject({
    // Only simple paths like /apps/resume-matcher (no query strings or odd characters).
    path: z.string().max(200).regex(/^\/[A-Za-z0-9\-._/]*$/),
    timestamp: z.iso.datetime(),
    browser: clean(120),
  }),
  debug: z.unknown().optional(),
});

export type Feedback = {
  type: FeedbackType;
  message: string;
  email?: string;
  context: { path: string; timestamp: string; browser: string };
  debug?: FeedbackDebug; // Resume Matcher
  letterDebug?: LetterFeedbackDebug; // Cover Letter Writer
};

const GENERIC_MESSAGE = "Something in the form wasn't right. Please refresh the page and try again.";

type FeedbackCheck = { ok: true; feedback: Feedback } | { ok: false; message: string } | { ok: "bot" };

export function parseFeedback(body: unknown): FeedbackCheck {
  // Bots fill in every field, including the hidden one. Treat them as handled, but drop the message.
  if (typeof body === "object" && body !== null && "website" in body && (body as { website?: unknown }).website) {
    return { ok: "bot" };
  }

  const checked = feedbackSchema.safeParse(body);
  if (!checked.success) {
    const field = checked.error.issues[0]?.path[0];
    if (field === "message") {
      return { ok: false, message: `Please write between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters.` };
    }
    if (field === "email") return { ok: false, message: "Please check your email address, or leave it empty." };
    return { ok: false, message: GENERIC_MESSAGE };
  }

  const { type, message, email, context, debug } = checked.data;
  let attached: unknown;
  if (debug !== undefined) {
    const checkedDebug = checkDebug(context.path, debug);
    if (!checkedDebug.ok) return { ok: false, message: GENERIC_MESSAGE };
    // Results are only attached to "Wrong result" reports from a page in the table.
    if (type === "wrong-result" && feedbackPage(context.path)) attached = checkedDebug.debug;
  }
  const fromLetterApp = context.path === COVER_LETTER_PATH;
  return {
    ok: true,
    feedback: {
      type,
      message,
      email,
      context,
      debug: fromLetterApp ? undefined : (attached as FeedbackDebug | undefined),
      letterDebug: fromLetterApp ? (attached as LetterFeedbackDebug | undefined) : undefined,
    },
  };
}
