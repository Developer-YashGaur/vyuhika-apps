import { matchBand, type CandidateMatch } from "@/lib/dwaar/candidate-match";

// For the employee: how well the candidate's resume fits this job, so they can decide quickly whether to help.
export default function MatchSummary({ match }: { match: CandidateMatch | undefined }) {
  if (!match) {
    return (
      <p className="dw-muted mb-3 text-sm">
        No resume match score for this request. It was made before scores were shared with employees, or the check did not finish.
      </p>
    );
  }
  const band = matchBand(match.score);
  const chip = band.tone === "good" ? "dw-chip dw-chip-good" : band.tone === "info" ? "dw-chip dw-chip-info" : "dw-chip dw-chip-warn";
  return (
    <section aria-label="Resume match for this job" className="mb-3 rounded-xl border p-3" style={{ background: "var(--dw-surface-2)", borderColor: "var(--dw-line)" }}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">Match {match.score}/100</span>
        <span className={chip}>{band.label}</span>
      </p>
      {match.summary && <p className="mt-1 text-sm leading-snug">{match.summary}</p>}
      {match.matched.length > 0 && (
        <p className="mt-2 text-sm">
          <strong>Fits the job:</strong> {match.matched.join(", ")}
        </p>
      )}
      {match.missing.length > 0 && (
        <p className="mt-1 text-sm">
          <strong>Not shown in the resume:</strong> {match.missing.join(", ")}
        </p>
      )}
      <p className="dw-muted mt-2 text-xs">An AI estimate from the candidate&apos;s resume and this job. It can be wrong, so look at their LinkedIn and skills too.</p>
    </section>
  );
}
