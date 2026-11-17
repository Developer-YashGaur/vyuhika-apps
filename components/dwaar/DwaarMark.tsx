// The Dwaar mark: a small arched doorway with a brass handle.
export default function DwaarMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 30V14C5 7.4 9.9 2.5 16 2.5S27 7.4 27 14v16Z" fill="#e9cf94" />
      <path d="M9 30V14.5c0-4.1 3-7.2 7-7.2s7 3.1 7 7.2V30Z" fill="#0b2f2c" />
      <circle cx="20" cy="19.5" r="1.6" fill="#e9cf94" />
    </svg>
  );
}
