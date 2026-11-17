import ScoreCard from "@/components/dwaar/ScoreCard";
import type { CheckView } from "@/lib/dwaar/match-check";

// The result of "Check my match", shown on the request form before anything is sent: the score, whether it is high
// enough to send, and free tips to improve the resume.

export default function MatchCheck({ check }: { check: CheckView }) {
  return (
    <section aria-label="Your match check" className="flex flex-col gap-4">
      <ScoreCard
        analysis={{ requestId: "", status: "done", score: check.score, summary: check.summary, strengths: check.strengths, gaps: check.gaps }}
      />
      {check.passed ? (
        <p role="status" className="dw-alert dw-alert-info">
          Your match is {check.score}. That is high enough to send your request.
        </p>
      ) : (
        <div role="status" className="dw-alert dw-alert-warn">
          <p className="font-semibold">
            Your match is {check.score}. You need {check.minScore} or more to send a request.
          </p>
          <p className="mt-1 text-sm">
            Employees are more likely to refer a resume that fits the job. Update your resume with the tips below, only with things
            that are true for you, then choose it again and press &ldquo;Check my match&rdquo;.
          </p>
        </div>
      )}
      {check.tips.length > 0 && (
        <div>
          <h3 className="dw-display text-lg">Tips to improve your match</h3>
          <ol className="mt-3 flex list-decimal flex-col gap-3 pl-5">
            {check.tips.map((tip) => (
              <li key={tip.title}>
                <p className="font-semibold">{tip.title}</p>
                <p className="dw-muted text-sm">{tip.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
