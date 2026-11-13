import { z } from "zod";
import {
  EMAIL_MAX,
  FEEDBACK_TYPES,
  MATCHER_PATH,
  MESSAGE_MAX,
  MESSAGE_MIN,
  stripHtml,
  type FeedbackDebug,
  type FeedbackType,
} from "@/lib/feedback/rules";

// Server-side check of a feedback request. Every object is "strict": any field we don't
// expect (like `resume` or `jobDescription`) makes the whole request invalid.

const clean = (max: number) => z.string().max(max * 2).transform(stripHtml).pipe(z.string().max(max));

const debugSchema = z.strictObject({
  score: z.number().int().min(0).max(100),
  summary: clean(240),
  matchedKeywords: z.array(clean(60)).max(25),
  missingKeywords: z.array(clean(60)).max(25),
});

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
  debug: debugSchema.optional(),
});

export type Feedback = {
  type: FeedbackType;
  message: string;
  email?: string;
  context: { path: string; timestamp: string; browser: string };
  debug?: FeedbackDebug;
};

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
    return { ok: false, message: "Something in the form wasn't right. Please refresh the page and try again." };
  }

  const { type, message, email, context, debug } = checked.data;
  return {
    ok: true,
    feedback: {
      type,
      message,
      email,
      context,
      // Results are only attached to "Wrong result" reports from the Resume Matcher.
      debug: type === "wrong-result" && context.path === MATCHER_PATH ? debug : undefined,
    },
  };
}
