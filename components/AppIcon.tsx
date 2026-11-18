import type { AppIconName } from "@/lib/apps";

// Small line icons drawn with SVG, so we don't need an icon library.

const paths: Record<AppIconName, React.ReactNode> = {
  // Two overlapping documents with a check mark: resume vs job description.
  match: (
    <>
      <rect x="3" y="3" width="11" height="14" rx="2" />
      <path d="M10 7h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-2" />
      <path d="m11.5 14 2 2 4-4" />
    </>
  ),
  // An envelope with a pen line.
  letter: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  // Two speech bubbles.
  interview: (
    <>
      <path d="M4 5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M18 9h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-3" />
    </>
  ),
  // A door ajar, with a handle.
  door: (
    <>
      <path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" />
      <path d="M3 21h18" />
      <path d="M15 7l4 1.5V21" />
      <path d="M11.5 12h.01" />
    </>
  ),
  // A wallet with a clasp.
  wallet: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h11v3" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M21 12h-4a2 2 0 0 0 0 4h4" />
      <path d="M17.2 14h.01" />
    </>
  ),
};

export default function AppIcon({ name }: { name: AppIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
