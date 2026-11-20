// The Dwaar mark: a blue rounded square with a white doorway.
export default function DwaarMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#2451e6" />
      <path d="M9 21V10a5 5 0 0 1 10 0v11" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 21v-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
