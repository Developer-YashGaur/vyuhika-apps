import { MIN_SCORE } from "@/lib/dwaar/match-check";

// What the Boost page tells the person after reading their match score: a good score means "you are ready, continue or
// download"; a lower score means "read the tips first". Downloading is always allowed.
export type NextStep = { good: boolean; title: string; text: string };

export function boostNextStep(score: number | null, before: number | null = null): NextStep {
  if (score === null) {
    return { good: false, title: "Your resume is ready", text: "Check every line, fill in anything in [brackets], then download it." };
  }
  if (score >= MIN_SCORE) {
    return {
      good: true,
      title: before !== null && before !== score ? `Good match: ${before} before, ${score} after` : `Good match: ${score} out of 100`,
      text: "Your resume fits this job well. Check every line, then continue with your request or download your resume.",
    };
  }
  return {
    good: false,
    title: before !== null && before !== score ? `Match: ${before} before, ${score} after` : `Match: ${score} out of 100`,
    text: "This job asks for things your resume does not show yet. Read the profile tips below and fill in anything that is true for you, then download your resume.",
  };
}
