// Original drawing: a visitor arriving at a company building at dusk, pass on a lanyard,
// reception lit up behind a glass door. Made in code (no photos, no real logos). Decorative.
export default function EntranceScene({ className = "" }: { className?: string }) {
  const floors = [58, 100, 142];
  const cols = [150, 196, 242, 288, 334, 380, 426, 472];
  const litSet = new Set(["0-1", "0-4", "0-6", "1-0", "1-2", "1-3", "1-5", "1-7", "2-1", "2-2", "2-6", "2-7", "0-2", "1-4"]);
  return (
    <svg viewBox="0 0 640 380" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1033" />
          <stop offset="0.65" stopColor="#2a1a5e" />
          <stop offset="1" stopColor="#7c3aed" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="dw-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141c45" />
          <stop offset="1" stopColor="#0c1233" />
        </linearGradient>
        <linearGradient id="dw-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="dw-spill" cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor="#fcd34d" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fcd34d" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="640" height="380" rx="24" fill="url(#dw-sky)" />
      <circle cx="560" cy="64" r="26" fill="#fef3c7" opacity="0.9" />
      <circle cx="570" cy="58" r="24" fill="#2a1a5e" opacity="0.9" />
      {[[40, 30], [110, 70], [220, 24], [380, 40], [520, 22], [610, 110], [60, 130], [300, 14]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="#eef2fb" opacity="0.7" />
      ))}

      {/* far skyline */}
      <path d="M0 270V210h34v-26h28v40h26v-60h30v70h40v-34h26v60h40V200h24v70zM520 270v-50h30v-36h26v44h34v-30h30v72z" fill="#171d4d" opacity="0.8" />

      {/* main building */}
      <rect x="120" y="36" width="400" height="260" rx="8" fill="url(#dw-wall)" stroke="#ffffff" strokeOpacity="0.12" />
      <rect x="120" y="36" width="400" height="12" rx="5" fill="#222b66" />
      {floors.map((y, r) =>
        cols.map((x, c) => (
          <rect
            key={`${r}-${c}`}
            x={x}
            y={y}
            width="30"
            height="24"
            rx="3"
            fill={litSet.has(`${r}-${c}`) ? "#fcd34d" : "#1c2658"}
            opacity={litSet.has(`${r}-${c}`) ? 0.82 : 1}
          />
        ))
      )}

      {/* entrance */}
      <rect x="244" y="172" width="152" height="10" rx="4" fill="#2b3678" />
      <rect x="262" y="190" width="116" height="26" rx="6" fill="#0b1230" stroke="#fcd34d" strokeOpacity="0.8" />
      <path d="M296 203h48M320 196v14" stroke="#fcd34d" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
      <ellipse cx="320" cy="300" rx="120" ry="30" fill="url(#dw-spill)" className="dw-door-glow" />
      <rect x="256" y="222" width="128" height="74" rx="4" fill="url(#dw-glass)" stroke="#fde68a" strokeOpacity="0.9" />
      <path d="M320 222v74" stroke="#92400e" strokeOpacity="0.6" strokeWidth="2" />
      <rect x="310" y="248" width="3.5" height="18" rx="1.7" fill="#fff7ed" />
      <rect x="326.5" y="248" width="3.5" height="18" rx="1.7" fill="#fff7ed" />
      {/* reception desk + receptionist through the glass */}
      <rect x="268" y="268" width="62" height="28" rx="3" fill="#3b1d0a" opacity="0.8" />
      <circle cx="286" cy="254" r="7" fill="#3b1d0a" opacity="0.8" />
      <rect x="279" y="260" width="14" height="12" rx="4" fill="#3b1d0a" opacity="0.8" />

      {/* ground and path to the door */}
      <rect y="296" width="640" height="84" fill="#080d24" />
      <path d="M0 296h640" stroke="#ffffff" strokeOpacity="0.14" />
      <path d="M262 296h116l52 84H210z" fill="#111a44" />
      <path d="M300 296l-22 84M340 296l22 84" stroke="#ffffff" strokeOpacity="0.08" />

      {/* planters */}
      {[168, 452].map((x) => (
        <g key={x}>
          <rect x={x} y="274" width="26" height="22" rx="4" fill="#222b66" />
          <path d={`M${x + 13} 274c-14-14-12-32-3-38 3 14 9 20 3 38zm0 0c14-12 14-30 5-38-4 13-9 20-5 38z`} fill="#34d399" opacity="0.85" />
        </g>
      ))}

      {/* visitor */}
      <g className="dw-walker">
        <circle cx="196" cy="268" r="13" fill="#e2c9a8" />
        <path d="M184 262c2-12 22-12 24 0-6-4-18-4-24 0z" fill="#1f1b2e" />
        <path d="M176 340v-46c0-11 9-19 20-19s20 8 20 19v46z" fill="#8b5cf6" />
        <path d="M184 340v26M208 340v26" stroke="#1f1b2e" strokeWidth="7" strokeLinecap="round" />
        <path d="M186 281l10 22 10-22" fill="none" stroke="#22d3ee" strokeWidth="2" />
        <rect x="188" y="302" width="16" height="22" rx="2.5" fill="#f6efe1" />
        <rect x="188" y="302" width="16" height="4" rx="1" fill="#0e7490" />
        <path d="M191 311h10M191 316h7" stroke="#9a8f78" strokeWidth="1.2" />
        <rect x="150" y="312" width="22" height="30" rx="4" fill="#0e7490" />
      </g>
    </svg>
  );
}
