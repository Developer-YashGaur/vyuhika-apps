import type { Analysis } from "@/lib/dwaar/requests";

// The free resume match result, shown only to the candidate. A ring with the score, one honest sentence,
// what already matches and what the job asks for that the resume does not mention.

function band(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Strong match", color: "#14543a" };
  if (score >= 55) return { label: "Promising match", color: "#85580a" };
  return { label: "Room to improve", color: "#8a1c14" };
}

export default function ScoreCard({ analysis }: { analysis: Analysis }) {
  if (analysis.status !== "done" || analysis.score === null) {
    return <p className="dw-alert dw-alert-warn">We could not check this resume right now, but your request was sent.</p>;
  }

  const { label, color } = band(analysis.score);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const filled = (analysis.score / 100) * circumference;

  return (
    <section aria-label="Resume match score" className="rounded-xl border p-4" style={{ background: "var(--dw-surface-2)", borderColor: "var(--dw-line)" }}>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 flex-none">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="#e4dccb" strokeWidth="6" />
            <circle cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${filled} ${circumference}`} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-lg font-bold">{analysis.score}</span>
        </div>
        <div className="min-w-0">
          <p className="dw-eyebrow">Resume match</p>
          <p className="font-bold" style={{ color }}>
            {label}
          </p>
          <p className="dw-muted text-sm leading-snug">{analysis.summary}</p>
        </div>
      </div>

      <details className="mt-3">
        <summary className="text-sm">See what matched and what is missing</summary>
        {analysis.strengths.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold">Already in your resume</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {analysis.strengths.map((k) => (
                <li key={k} className="dw-chip dw-chip-good">
                  {k}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.gaps.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold">The job asks for, your resume does not mention</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {analysis.gaps.map((k) => (
                <li key={k} className="dw-chip dw-chip-warn">
                  {k}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="dw-muted mt-3 text-xs">Employees you ask for a referral can see this score and which skills matched. Nobody sees your resume.</p>
      </details>
    </section>
  );
}
