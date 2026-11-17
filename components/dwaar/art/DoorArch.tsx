import type { CSSProperties } from "react";

// The hero picture is a small funny story that loops every 14 seconds: a job seeker knocks on a locked door asking
// for a referral, the door opens, an employee steps in from the side and stamps ACCEPTED, and everyone celebrates.
// It is drawn in plain SVG and moved with CSS (see "hero story" in dwaar.css). With reduced motion it shows the happy
// ending as a still picture. The picture has a text description for screen readers.
export default function DoorArch({ className = "" }: { className?: string }) {
  return (
    <div className={`dw-hero-art ${className}`}>
      <svg
        viewBox="0 0 440 400"
        role="img"
        aria-label="A funny little story: a job seeker knocks on a locked door and asks for a referral. The door opens, an employee steps in from the side, stamps the request Accepted, and the job seeker cheers."
        className="dw-stage"
      >
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

        <g className="dw-st-scene">
          <circle cx="220" cy="200" r="190" fill="#f1e5c4" />
          <ellipse cx="220" cy="362" rx="214" ry="28" fill="#eadfc0" />

          {/* the doorway: stone frame, warm light inside, steps */}
          <rect x="126" y="350" width="188" height="10" rx="3" fill="#d9cdb0" />
          <rect x="116" y="360" width="208" height="10" rx="3" fill="#c8bb98" />
          <path d="M138 350V160C138 92 174 52 220 52s82 40 82 108v190Z" fill="#e9cf94" stroke="#b4801f" strokeWidth="3" />
          <path d="M154 350V165C154 108 184 70 220 70s66 38 66 95v185Z" fill="url(#dw-light)" />
          <ellipse className="dw-st-glow" cx="236" cy="348" rx="64" ry="8" fill="#e7bb5e" opacity="0.7" />
          <path d="M206 52h28l-4 18h-20Z" fill="#b4801f" />

          {/* the door leaf, hinged on the left. It shudders when knocked on, then swings open. */}
          <g className="dw-st-shudder">
            <g className="dw-st-leaf">
              <path d="M154 350V165C154 108 184 70 220 70s66 38 66 95v185Z" fill="url(#dw-leaf)" />
              <rect x="168" y="150" width="48" height="72" rx="4" fill="none" stroke="#1d7a72" strokeWidth="2" opacity="0.8" />
              <rect x="224" y="150" width="48" height="72" rx="4" fill="none" stroke="#1d7a72" strokeWidth="2" opacity="0.8" />
              <rect x="168" y="236" width="48" height="96" rx="4" fill="none" stroke="#1d7a72" strokeWidth="2" opacity="0.8" />
              <rect x="224" y="236" width="48" height="96" rx="4" fill="none" stroke="#1d7a72" strokeWidth="2" opacity="0.8" />
              <circle cx="270" cy="262" r="6" fill="#e9cf94" />
              {/* a padlock that rattles */}
              <g className="dw-st-lock">
                <path d="M255 284v-7a7 7 0 0 1 14 0v7" fill="none" stroke="#c9bfa8" strokeWidth="3.5" strokeLinecap="round" />
                <rect x="252" y="284" width="20" height="16" rx="3" fill="#e9cf94" stroke="#85580a" strokeWidth="1.5" />
                <circle cx="262" cy="292" r="2" fill="#85580a" />
              </g>
              {/* the sign every locked door has */}
              <g className="dw-st-sign">
                <path d="M205 124l15-12 15 12" fill="none" stroke="#c9bfa8" strokeWidth="1.5" />
                <rect x="186" y="124" width="68" height="24" rx="3" fill="#f4e8cc" stroke="#b4801f" strokeWidth="1.5" />
                <text x="220" y="140" textAnchor="middle" fontSize="9" fontWeight="700" fill="#14201f">BACK IN 5 MIN</text>
              </g>
            </g>
          </g>

          {/* knock sounds */}
          <text className="dw-st-tok dw-st-tok-1" x="150" y="286" fontSize="11" fontWeight="800" fill="#85580a">TOK!</text>
          <text className="dw-st-tok dw-st-tok-2" x="156" y="274" fontSize="11" fontWeight="800" fill="#85580a">TOK!</text>
          <text className="dw-st-tok dw-st-tok-3" x="150" y="262" fontSize="11" fontWeight="800" fill="#85580a">TOK!</text>

          {/* ---- the job seeker (left) ---- */}
          <ellipse cx="95" cy="352" rx="26" ry="4" fill="#14201f" opacity="0.12" />
          <g className="dw-st-cwalk">
            <g className="dw-st-cbob">
              <rect x="68" y="292" width="16" height="32" rx="6" fill="#0f4c47" />
              <rect x="85" y="326" width="9" height="24" rx="3" fill="#2b3a55" />
              <rect x="97" y="326" width="9" height="24" rx="3" fill="#2b3a55" />
              <ellipse cx="88" cy="350" rx="8" ry="3.5" fill="#14201f" />
              <ellipse cx="103" cy="350" rx="8" ry="3.5" fill="#14201f" />
              <rect x="80" y="286" width="30" height="44" rx="11" fill="#e8a33d" />
              {/* a resume held in the other hand */}
              <rect x="62" y="318" width="16" height="22" rx="2" fill="#fff" stroke="#c9bfa8" strokeWidth="1.2" transform="rotate(-8 70 329)" />
              <path d="M65 324h10M65 328h10M65 332h7" stroke="#b9b09a" strokeWidth="1.3" transform="rotate(-8 70 329)" />
              <circle cx="95" cy="268" r="16" fill="#f2c9a0" />
              <path d="M79 267A16 16 0 0 1 111 267Q95 258 79 267Z" fill="#2a1d17" />
              <circle cx="89" cy="271" r="1.9" fill="#14201f" />
              <circle cx="101" cy="271" r="1.9" fill="#14201f" />
              <path d="M85 265l7 2M105 265l-7 2" stroke="#2a1d17" strokeWidth="1.5" strokeLinecap="round" />
              <path className="dw-st-worry" d="M89 279q3-3 6 0t6 0" fill="none" stroke="#14201f" strokeWidth="1.6" strokeLinecap="round" />
              <path className="dw-st-smile" d="M88 276q7 8 14 0" fill="none" stroke="#14201f" strokeWidth="1.8" strokeLinecap="round" />
              <path className="dw-st-sweat" d="M110 262q3 5 0 8q-3-3 0-8Z" fill="#6fb6e8" />
              <g className="dw-st-arm-c">
                <rect x="108" y="291.5" width="28" height="9" rx="4.5" fill="#e8a33d" />
                <circle cx="137" cy="296" r="5.5" fill="#f2c9a0" />
              </g>
            </g>
          </g>

          {/* ---- the employee (right), arrives from the side ---- */}
          <ellipse cx="360" cy="352" rx="26" ry="4" fill="#14201f" opacity="0.12" />
          <g className="dw-st-ewalk">
            <g className="dw-st-ebob">
              <rect x="346" y="326" width="9" height="24" rx="3" fill="#1d2a3a" />
              <rect x="361" y="326" width="9" height="24" rx="3" fill="#1d2a3a" />
              <ellipse cx="350" cy="350" rx="8" ry="3.5" fill="#14201f" />
              <ellipse cx="366" cy="350" rx="8" ry="3.5" fill="#14201f" />
              <rect x="345" y="286" width="30" height="44" rx="11" fill="#0f4c47" />
              <path d="M353 286l7 12 7-12Z" fill="#fff" />
              <path d="M356 288l4 38M364 288l-4 38" stroke="#b4801f" strokeWidth="1.5" />
              <rect x="354" y="306" width="12" height="15" rx="2" fill="#fff" stroke="#b4801f" strokeWidth="1.2" />
              <path d="M357 311h6M357 315h4" stroke="#85580a" strokeWidth="1.2" />
              {/* coffee in the free hand */}
              <rect x="374" y="298" width="9" height="22" rx="4.5" fill="#0f4c47" />
              <rect x="377" y="318" width="14" height="14" rx="2.5" fill="#fff" stroke="#c9bfa8" strokeWidth="1.2" />
              <path d="M391 321q6 1 0 7" fill="none" stroke="#c9bfa8" strokeWidth="1.5" />
              <path className="dw-st-steam" d="M381 314q-3-4 0-7M386 314q-3-4 0-7" fill="none" stroke="#9aa5a2" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="360" cy="268" r="16" fill="#c98f66" />
              <path d="M344 266A16 16 0 0 1 376 266Q360 256 344 266Z" fill="#14201f" />
              <circle cx="354" cy="271" r="1.9" fill="#14201f" />
              <circle cx="366" cy="271" r="1.9" fill="#14201f" />
              <circle cx="354" cy="271" r="5" fill="none" stroke="#14201f" strokeWidth="1.2" />
              <circle cx="366" cy="271" r="5" fill="none" stroke="#14201f" strokeWidth="1.2" />
              <path d="M359 271h2" stroke="#14201f" strokeWidth="1.2" />
              <path d="M353 277q7 7 14 0" fill="none" stroke="#14201f" strokeWidth="1.8" strokeLinecap="round" />
              {/* the arm with the ACCEPTED stamp */}
              <g className="dw-st-arm-e">
                <rect x="312" y="291.5" width="36" height="9" rx="4.5" fill="#0f4c47" />
                <circle cx="311" cy="296" r="5.5" fill="#c98f66" />
                <rect x="299" y="276" width="8" height="18" rx="3" fill="#85580a" />
                <rect x="291" y="294" width="24" height="9" rx="2" fill="#b4801f" />
              </g>
            </g>
          </g>

          {/* speech bubbles */}
          <g className="dw-st-bubble1">
            <path d="M16 186h118a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H92l-10 16-6-16H16a8 8 0 0 1-8-8v-30a8 8 0 0 1 8-8Z" fill="#fff" stroke="#c9bfa8" strokeWidth="1.5" />
            <text x="75" y="206" textAnchor="middle" fontSize="11" fontWeight="700" fill="#14201f">Knock knock!</text>
            <text x="75" y="221" textAnchor="middle" fontSize="11" fill="#36423f">Referral, please?</text>
          </g>
          <g className="dw-st-bubble2">
            <path d="M308 186h116a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8h-52l-10 16-6-16h-48a8 8 0 0 1-8-8v-30a8 8 0 0 1 8-8Z" fill="#fff" stroke="#c9bfa8" strokeWidth="1.5" />
            <text x="366" y="206" textAnchor="middle" fontSize="11" fontWeight="700" fill="#14201f">Nice resume!</text>
            <text x="366" y="221" textAnchor="middle" fontSize="11" fill="#36423f">I will refer you.</text>
          </g>

          {/* the stamp */}
          <g className="dw-st-stamp">
            <rect x="152" y="238" width="136" height="42" rx="6" fill="#e1f1e8" fillOpacity="0.92" stroke="#14543a" strokeWidth="4" />
            <rect x="158" y="244" width="124" height="30" rx="3" fill="none" stroke="#14543a" strokeWidth="1.5" />
            <text x="220" y="267" textAnchor="middle" fontSize="22" fontWeight="800" letterSpacing="2" fill="#14543a">ACCEPTED</text>
          </g>

          {/* confetti */}
        <rect className="dw-st-conf dw-st-conf-a" x="40" y="-14" width="7" height="11" rx="1.5" fill="#b4801f" style={{ "--spin": "360deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-b" x="72" y="-14" width="7" height="11" rx="1.5" fill="#14625b" style={{ "--spin": "-480deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-c" x="104" y="-14" width="7" height="11" rx="1.5" fill="#e46a4e" style={{ "--spin": "600deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-a" x="136" y="-14" width="7" height="11" rx="1.5" fill="#3b82c4" style={{ "--spin": "-720deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-b" x="168" y="-14" width="7" height="11" rx="1.5" fill="#e8a33d" style={{ "--spin": "360deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-c" x="200" y="-14" width="7" height="11" rx="1.5" fill="#7c5cbf" style={{ "--spin": "-480deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-a" x="232" y="-14" width="7" height="11" rx="1.5" fill="#b4801f" style={{ "--spin": "600deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-b" x="264" y="-14" width="7" height="11" rx="1.5" fill="#14625b" style={{ "--spin": "-720deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-c" x="296" y="-14" width="7" height="11" rx="1.5" fill="#e46a4e" style={{ "--spin": "360deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-a" x="328" y="-14" width="7" height="11" rx="1.5" fill="#3b82c4" style={{ "--spin": "-480deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-b" x="360" y="-14" width="7" height="11" rx="1.5" fill="#e8a33d" style={{ "--spin": "600deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-c" x="392" y="-14" width="7" height="11" rx="1.5" fill="#7c5cbf" style={{ "--spin": "-720deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-a" x="56" y="-14" width="7" height="11" rx="1.5" fill="#b4801f" style={{ "--spin": "360deg" } as CSSProperties} />
        <rect className="dw-st-conf dw-st-conf-b" x="344" y="-14" width="7" height="11" rx="1.5" fill="#14625b" style={{ "--spin": "-480deg" } as CSSProperties} />
        </g>
      </svg>
    </div>
  );
}
