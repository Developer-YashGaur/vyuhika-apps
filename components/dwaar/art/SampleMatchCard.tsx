// A small example card for the front page. It shows what a match result looks like. The numbers are an example, not a real person.
const BARS = [
  { label: "Skills", value: 90 },
  { label: "Experience", value: 78 },
  { label: "Keywords", value: 70 },
];

export default function SampleMatchCard() {
  return (
    <figure className="dw-sample" aria-label="Example of a match result">
      <figcaption className="dw-sample-head">
        <span>
          <span className="dw-sample-kicker">Example match for</span>
          <strong>Backend Developer · Acme</strong>
        </span>
        <span className="dw-status dw-status-ok">Strong match</span>
      </figcaption>
      <div className="dw-sample-body">
        <div className="dw-ring" role="img" aria-label="Score 82 out of 100">
          <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
            <circle cx="52" cy="52" r="44" fill="none" stroke="#e8ecf6" strokeWidth="10" />
            <circle cx="52" cy="52" r="44" fill="none" stroke="#2451e6" strokeWidth="10" strokeLinecap="round" strokeDasharray="227 277" transform="rotate(-90 52 52)" />
          </svg>
          <span className="dw-ring-num">
            <b>82</b>
            <small>of 100</small>
          </span>
        </div>
        <ul className="dw-bars">
          {BARS.map((b) => (
            <li key={b.label}>
              <span>{b.label}</span>
              <span>{b.value}</span>
              <span className="dw-bar" aria-hidden="true">
                <span style={{ width: `${b.value}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
