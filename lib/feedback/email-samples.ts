import type { Feedback } from "@/lib/feedback/schema";

// Example feedback used by the email preview (/dev/emails) and scripts/send-test-emails.ts.

export const sampleFeedback: Record<"bug" | "wrong-result", Feedback> = {
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
};
