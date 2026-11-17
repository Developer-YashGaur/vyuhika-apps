import type { Analysis } from "@/lib/dwaar/requests";

// The free resume match result, shown only to the candidate. A ring with the score, one honest sentence,
// what already matches and what the job asks for that the resume does not mention.

function band(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Strong match", color: "#15803d" };
  if (score >= 55) return { label: "Promising match", color: "#b45309" };
  return { label: "Room to improve", color: "#9f1239" };
}

export default function ScoreCard({ analysis }: { analysis: Analysis }) {
  if (analysis.status !== "done" || analysis.score === null) {
    return (
      <p className="dw-muted rounded-lg border border-dashed border-[#1d1a16]/30 px-3 py-2 text-sm">
        We could not check this resume right now, but your request is at reception.
      </p>
    );
  }

  const { label, color } = band(analysis.score);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const filled = (analysis.score / 100) * circumference;

  return (
    <section aria-label="Resume match score" className="rounded-xl border border-[#1d1a16]/20 bg-white/50 p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 flex-none">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="#1d1a16" strokeOpacity="0.12" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-lg font-extrabold">{analysis.score}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] dw-muted">Resume match</p>
          <p className="text-base font-bold" style={{ color }}>{label}</p>
          <p className="dw-muted text-sm leading-snug">{analysis.summary}</p>
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">See what matched and what is missing</summary>
        {analysis.strengths.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] dw-muted">Already in your resume</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {analysis.strengths.map((k) => (
                <li key={k} className="chip chip-cyan">{k}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.gaps.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] dw-muted">The job asks for, your resume does not mention</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {analysis.gaps.map((k) => (
                <li key={k} className="chip chip-violet">{k}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="dw-muted mt-3 text-xs">Only you can see this. Employees never see your resume or your score.</p>
      </details>
    </section>
  );
}
