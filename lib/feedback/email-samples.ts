import type { Feedback } from "@/lib/feedback/schema";

// Example feedback used by the email preview (/dev/emails) and scripts/send-test-emails.ts.

export const sampleFeedback: Record<"bug" | "wrong-result" | "letter", Feedback> = {
  bug: {
    type: "bug",
    message:
      "The upload button does nothing on my phone. I tapped it a few times and nothing opened.\nI'm on an iPhone with Safari.",
    email: "priya@example.com",
    context: {
      path: "/apps/resume-matcher",
      timestamp: "2026-11-13T10:49:32.000Z",
      browser: "Safari on iOS, 390×844 window",
    },
  },
  "wrong-result": {
    type: "wrong-result",
    message: "Docker is listed as missing, but my resume mentions containers and Docker Compose in the second job.",
    email: "priya@example.com",
    context: {
      path: "/apps/resume-matcher",
      timestamp: "2026-11-13T10:52:10.000Z",
      browser: "Chrome on macOS, 1440×900 window",
    },
    debug: {
      score: 62,
      summary: "Strong React and TypeScript, but missing Next.js, AWS and Docker, which the job requires.",
      matchedKeywords: ["React", "TypeScript", "REST APIs", "SQL", "Git", "Agile"],
      missingKeywords: ["Next.js", "GraphQL", "AWS", "Docker", "CI/CD pipelines"],
    },
  },
  // A "Wrong result" report from the Cover Letter Writer: settings and counts only.
  letter: {
    type: "wrong-result",
    message: "The letter is far longer than the short length I picked, and two blanks are in the middle of sentences.",
    email: "priya@example.com",
    context: {
      path: "/apps/cover-letter-writer",
      timestamp: "2026-11-16T09:30:05.000Z",
      browser: "Chrome on macOS, 1440×900 window",
    },
    letterDebug: {
      tone: "friendly",
      length: "short",
      wordCount: 248,
      blanks: 2,
      companyFilled: true,
      roleFilled: true,
      highlightFilled: false,
      highlightHandling: "not-provided",
      notes: ["length"],
    },
  },
};
