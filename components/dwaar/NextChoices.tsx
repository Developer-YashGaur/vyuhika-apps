import Link from "next/link";
import { boostChoices } from "@/lib/dwaar/boost-choices";

// After a Boost: a few clear choices for what to do next. The best one for this score is first and highlighted.
export default function NextChoices({ requestId, good }: { requestId: string; good: boolean }) {
  const choices = boostChoices(requestId, good);
  return (
    <section aria-labelledby="dw-next" className="lg:col-span-2">
      <h2 id="dw-next" className="dw-display mb-1 text-xl font-medium">
        What would you like to do next?
      </h2>
      <p className="dw-muted mb-4 text-sm">Pick one. You can come back to the others any time.</p>
      <ul className="dw-choices">
        {choices.map((c) => (
          <li key={c.id} className={c.recommended ? "dw-choice dw-choice-top" : "dw-choice"}>
            {c.recommended && <span className="dw-chip dw-chip-info self-start">Recommended</span>}
            <h3 className="dw-display text-lg">{c.title}</h3>
            <p className="dw-muted text-sm leading-relaxed">{c.text}</p>
            {c.download ? (
              <a href={c.href} download className={c.recommended ? "dw-btn dw-btn-primary mt-auto" : "dw-btn dw-btn-quiet mt-auto"}>
                {c.action}
              </a>
            ) : (
              <Link href={c.href} className={c.recommended ? "dw-btn dw-btn-primary mt-auto" : "dw-btn dw-btn-quiet mt-auto"}>
                {c.action}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
