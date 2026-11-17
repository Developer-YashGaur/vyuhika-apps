// The hero picture: an arched doorway, slightly open, with warm light inside.
// Decorative only (aria-hidden). The two small cards beside it are a sample of what the product shows.
export default function DoorArch({ className = "" }: { className?: string }) {
  return (
    <div className={`dw-hero-art ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 480" role="presentation" className="block h-auto w-full">
        <defs>
          <linearGradient id="dw-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6dc" />
            <stop offset="1" stopColor="#f6d58c" />
          </linearGradient>
          <linearGradient id="dw-leaf" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0a3b37" />
            <stop offset="1" stopColor="#14625b" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="255" r="190" fill="#f1e5c4" />
        <ellipse cx="200" cy="470" rx="170" ry="9" fill="#14201f" opacity="0.1" />
        {/* steps */}
        <rect x="58" y="450" width="284" height="14" rx="3" fill="#d9cdb0" />
        <rect x="44" y="464" width="312" height="14" rx="3" fill="#c8bb98" />
        {/* stone frame */}
        <path d="M62 452V206C62 106 126 40 200 40s138 66 138 166v246Z" fill="#e9cf94" />
        <path d="M62 452V206C62 106 126 40 200 40s138 66 138 166v246Z" fill="none" stroke="#b4801f" strokeWidth="3" />
        {/* the opening, with light */}
        <path className="dw-door-light" d="M94 452V212C94 130 142 76 200 76s106 54 106 136v240Z" fill="url(#dw-light)" />
        <ellipse cx="226" cy="448" rx="70" ry="9" fill="#e7bb5e" opacity="0.65" />
        {/* the open door leaf */}
        <path d="M94 452V214C94 146 124 96 160 82L176 98V432Z" fill="url(#dw-leaf)" />
        <path d="M110 160V420M110 160c12-30 28-48 48-58" fill="none" stroke="#1d7a72" strokeWidth="2" opacity="0.7" />
        <rect x="116" y="190" width="40" height="86" rx="4" fill="none" stroke="#1d7a72" strokeWidth="2" opacity="0.7" />
        <rect x="116" y="300" width="40" height="86" rx="4" fill="none" stroke="#1d7a72" strokeWidth="2" opacity="0.7" />
        <circle cx="160" cy="292" r="6" fill="#e9cf94" />
        {/* keystone */}
        <path d="M184 40h32l-5 22h-22Z" fill="#b4801f" />
      </svg>

      <div className="dw-float dw-float-a">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#e4dccb" strokeWidth="5" />
          <circle cx="20" cy="20" r="16" fill="none" stroke="#14543a" strokeWidth="5" strokeLinecap="round" strokeDasharray="73 101" transform="rotate(-90 20 20)" />
          <text x="20" y="25" textAnchor="middle" fontSize="13" fontWeight="700" fill="#14201f">72</text>
        </svg>
        <span>
          <strong>Resume match</strong>
          <span className="dw-muted">Sample</span>
        </span>
      </div>
      <div className="dw-float dw-float-b">
        <span className="dw-status dw-status-ok">Accepted</span>
        <span>
          <strong>Referral request</strong>
          <span className="dw-muted">Sample</span>
        </span>
      </div>
    </div>
  );
}
