import type { MatchResult } from "@/lib/types";

// Fake analysis result, used only in tests (the app calls the real AI through /api/analyze).
// It waits a moment like a real request would, then returns sample data.
export async function mockAnalyzeMatch(
  resume: string,
  jobDescription: string,
  delayMs = 3000,
): Promise<MatchResult> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return {
    score: 72,
    summary: "Strong on React and TypeScript, but missing the cloud and deployment tools the job asks for.",
    matchedKeywords: ["React", "TypeScript", "REST APIs", "SQL", "Git", "Agile", "Unit testing"],
    missingKeywords: ["Next.js", "AWS", "Docker", "CI/CD", "GraphQL"],
    suggestions: [
      {
        title: "Add the cloud tools they ask for",
        detail:
          "The job mentions AWS and Docker three times. If you've used them, even in a side project, add a bullet that names them.",
      },
      {
        title: "Show results with numbers",
        detail:
          "Change \"Improved page speed\" to something like \"Cut page load time by 40% for 20k daily users\". Numbers make impact easy to see.",
      },
      {
        title: "Match their wording",
        detail:
          "They say \"CI/CD pipelines\"; your resume says \"automated deployments\". Use their phrase so screening software picks it up.",
      },
    ],
  };
}
