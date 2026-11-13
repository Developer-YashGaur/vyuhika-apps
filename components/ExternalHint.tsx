// Marks a link that opens in a new tab: a small arrow for sighted visitors,
// and the words "(opens in a new tab)" for screen readers.
export default function ExternalHint() {
  return (
    <>
      <svg
        viewBox="0 0 12 12"
        width="10"
        height="10"
        aria-hidden="true"
        className="external-hint"
      >
        <path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );
}
