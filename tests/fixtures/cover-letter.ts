import type { CoverLetterResult } from "@/lib/cover-letter/schema";

// A cover letter for the sample resume and job (lib/samples.ts) that passes every check.
// Shared by the cover letter tests. Never sent to a real AI.

export const NEXT_JS_GAP = "[add a real example of working with Next.js or another server-rendered framework here]";

// A letter that follows every rule: a specific opening hook, numbers only from the resume (4, 2022, 20,000),
// one gap whose placeholder sits inside a sentence.
export const validLetter = `Dear Hiring Manager,

Speed and accessibility sit at the heart of the dashboard you are building at Nimbus Cloud. For the past 4 years I have built fast, accessible web apps with React and TypeScript, and that is the work I want to do next.

At ShopLane, where I have worked since 2022, I built the checkout flow in React and TypeScript that 20,000 shoppers use every day. I improved page speed by rewriting the product list with virtualised rendering, and I worked with the backend team to design REST APIs for orders and payments. Unit tests with Jest and React Testing Library are part of how I ship every feature.

The role also asks for Next.js, and at ShopLane I ${NEXT_JS_GAP}.

Before ShopLane, I built marketing sites with HTML, CSS and JavaScript at PixelCraft Studio, wrote SQL reports for the sales team, and worked in two-week Agile sprints using Git.

I would welcome the chance to talk about how I could help your team build a faster, more accessible dashboard.

Kind regards,
Priya Sharma`;

export const valid: CoverLetterResult = {
  letter: validLetter,
  gaps: [{ need: "Next.js or a server-rendered framework", placeholder: NEXT_JS_GAP }],
  highlightHandling: "not-provided",
  highlightEvidence: "",
};
