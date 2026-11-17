import type { CandidateExtras } from "@/lib/dwaar/candidate-extras";

// LinkedIn, other links and skills of a candidate, for the employee. No phone number or email is ever shown here.

function label(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

export default function CandidateDetails({ extras }: { extras: CandidateExtras | undefined }) {
  if (!extras || (!extras.linkedinUrl && extras.otherLinks.length === 0 && extras.skills.length === 0)) return null;
  return (
    <div className="mb-3 flex flex-col gap-2">
      {(extras.linkedinUrl || extras.otherLinks.length > 0) && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Candidate links">
          {extras.linkedinUrl && (
            <li>
              <a href={extras.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="dw-link">
                LinkedIn<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          )}
          {extras.otherLinks.map((l) => (
            <li key={l}>
              <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="dw-link">
                {label(l)}<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {extras.skills.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Skills">
          {extras.skills.map((s) => (
            <li key={s} className="dw-chip dw-chip-info">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
