// Original drawing: someone arriving at a company entrance with a visitor pass on a lanyard.
// Made in code (no photos, no real logos). Decorative, so it is hidden from screen readers.
export default function EntranceScene({ className = "" }: { className?: string }) {
  const lit = [
    [120, 62], [160, 62], [200, 62], [240, 62], [280, 62], [320, 62], [350, 62],
    [120, 96], [160, 96], [240, 96], [320, 96], [350, 96],
    [120, 130], [160, 130], [200, 130], [300, 130], [330, 130],
  ];
  const dark = [[200, 96], [280, 96], [240, 130], [350, 130], [280, 130], [320, 130]];
  return (
    <svg viewBox="0 0 480 300" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1030" />
          <stop offset="1" stopColor="#050816" />
        </linearGradient>
        <linearGradient id="dw-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#67e8f9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="dw-spill" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="480" height="300" rx="20" fill="url(#dw-sky)" />
      {/* stars */}
      {[[40, 30], [90, 18], [420, 36], [455, 70], [30, 90], [400, 14]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#eef2fb" opacity="0.6" />
      ))}

      {/* building */}
      <rect x="100" y="40" width="280" height="212" rx="6" fill="#0f1633" stroke="#ffffff" strokeOpacity="0.1" />
      <rect x="100" y="40" width="280" height="10" rx="4" fill="#1a2250" />
      {lit.map(([x, y]) => (
        <rect key={`l${x}-${y}`} x={x} y={y} width="26" height="20" rx="3" fill="#fcd34d" opacity="0.78" />
      ))}
      {dark.map(([x, y]) => (
        <rect key={`d${x}-${y}`} x={x} y={y} width="26" height="20" rx="3" fill="#1d2754" />
      ))}

      {/* canopy, name plate and door */}
      <rect x="196" y="150" width="88" height="8" rx="3" fill="#252f69" />
      <rect x="208" y="122" width="64" height="22" rx="5" fill="#0b1230" stroke="#22d3ee" strokeOpacity="0.7" />
      <path d="M232 133h16M240 127v12" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <ellipse cx="240" cy="252" rx="70" ry="22" fill="url(#dw-spill)" className="dw-door-glow" />
      <rect x="208" y="160" width="64" height="92" rx="4" fill="url(#dw-glass)" stroke="#67e8f9" strokeOpacity="0.8" />
      <path d="M240 160v92" stroke="#67e8f9" strokeOpacity="0.7" />
      <rect x="232" y="204" width="3" height="16" rx="1.5" fill="#eef2fb" />
      <rect x="245" y="204" width="3" height="16" rx="1.5" fill="#eef2fb" />
      {/* reception desk seen through the glass */}
      <rect x="216" y="226" width="48" height="20" rx="2" fill="#0b1230" opacity="0.85" />
      <circle cx="228" cy="214" r="5" fill="#0b1230" opacity="0.85" />
      <rect x="223" y="219" width="10" height="9" rx="3" fill="#0b1230" opacity="0.85" />

      {/* ground */}
      <rect y="252" width="480" height="48" fill="#080d24" />
      <path d="M0 252h480" stroke="#ffffff" strokeOpacity="0.1" />
      <path d="M200 252h80l30 48H170z" fill="#0d1430" opacity="0.9" />

      {/* plants */}
      <rect x="150" y="236" width="18" height="16" rx="3" fill="#1d2754" />
      <path d="M159 236c-10-10-8-22-2-26 2 10 6 14 2 26zm0 0c10-9 10-21 4-26-3 9-6 14-4 26z" fill="#34d399" opacity="0.8" />
      <rect x="312" y="236" width="18" height="16" rx="3" fill="#1d2754" />
      <path d="M321 236c-10-10-8-22-2-26 2 10 6 14 2 26zm0 0c10-9 10-21 4-26-3 9-6 14-4 26z" fill="#34d399" opacity="0.8" />

      {/* visitor walking to the door */}
      <g className="dw-walker">
        <circle cx="96" cy="196" r="10" fill="#cbd5f5" />
        <path d="M82 252v-34c0-8 6-14 14-14s14 6 14 14v34z" fill="#8b5cf6" />
        <path d="M89 252v18M103 252v18" stroke="#cbd5f5" strokeWidth="5" strokeLinecap="round" />
        {/* lanyard and pass */}
        <path d="M90 206l6 14 6-14" fill="none" stroke="#22d3ee" strokeWidth="1.6" />
        <rect x="90" y="220" width="12" height="16" rx="2" fill="#f6efe1" />
        <path d="M92 225h8M92 229h6" stroke="#9a8f78" strokeWidth="1" />
      </g>
    </svg>
  );
}
