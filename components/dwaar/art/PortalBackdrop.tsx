// The hero background: glowing arched doorways, orbit lines and a few dots, drawn in plain SVG.
// It is only decoration (hidden from screen readers) and moves very gently. With reduced motion it stands still.
export default function PortalBackdrop() {
  return (
    <svg className="dw-backdrop" viewBox="0 0 1360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dw-bg-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2451e6" />
          <stop offset="1" stopColor="#8b6cff" />
        </linearGradient>
        <radialGradient id="dw-bg-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#8b6cff" stopOpacity=".28" />
          <stop offset=".6" stopColor="#2451e6" stopOpacity=".08" />
          <stop offset="1" stopColor="#2451e6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dw-bg-cyan" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity=".22" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <pattern id="dw-bg-dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#2451e6" opacity=".14" />
        </pattern>
      </defs>
      <rect width="1360" height="640" fill="url(#dw-bg-dots)" />
      <circle cx="1030" cy="330" r="360" fill="url(#dw-bg-glow)" />
      <circle cx="1250" cy="120" r="180" fill="url(#dw-bg-cyan)" />
      <g fill="none" stroke="url(#dw-bg-line)" strokeWidth="1.4">
        <path opacity=".55" d="M930 640V330a100 100 0 0 1 200 0v310" />
        <path opacity=".4" d="M880 640V330a150 150 0 0 1 300 0v310" />
        <path opacity=".28" d="M830 640V330a200 200 0 0 1 400 0v310" />
        <path opacity=".18" d="M780 640V330a250 250 0 0 1 500 0v310" />
        <ellipse className="dw-orbit dw-orbit-a" opacity=".35" cx="1030" cy="330" rx="330" ry="110" transform="rotate(-18 1030 330)" />
        <ellipse className="dw-orbit dw-orbit-b" opacity=".25" cx="1030" cy="330" rx="400" ry="150" transform="rotate(14 1030 330)" />
      </g>
      <g fill="#2451e6">
        <circle cx="1340" cy="215" r="4" />
        <circle cx="745" cy="400" r="3" opacity=".6" />
        <circle cx="1150" cy="70" r="3" opacity=".7" />
      </g>
      <g fill="#8b6cff">
        <circle cx="760" cy="250" r="3.5" />
        <circle cx="1280" cy="470" r="3" opacity=".7" />
      </g>
      <g fill="#22d3ee">
        <circle cx="1210" cy="190" r="3.5" />
        <circle cx="880" cy="110" r="2.5" />
      </g>
    </svg>
  );
}
