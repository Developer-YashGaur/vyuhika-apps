"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import AppIcon from "@/components/AppIcon";
import { appHref, type AppInfo } from "@/lib/apps";

// One card in the bento grid. Free apps glow cyan, Pro apps glow violet.
// Effects: a spotlight that follows the cursor, an animated gradient border,
// and a gentle 3D tilt. Live apps are links; "coming soon" apps are locked.

const MAX_TILT = 5; // degrees (the big card tilts less, since it is wider)

export const cardReveal = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AppCard({ app, featured = false }: { app: AppInfo; featured?: boolean }) {
  const isLive = app.status === "live";
  const reduceMotion = useReducedMotion();

  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 18 });

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;

    // Spotlight position, read by CSS.
    e.currentTarget.style.setProperty("--mx", `${x}px`);
    e.currentTarget.style.setProperty("--my", `${y}px`);

    if (!reduceMotion && e.pointerType === "mouse") {
      const tilt = featured ? MAX_TILT / 2 : MAX_TILT;
      rotateY.set((x / box.width - 0.5) * tilt * 2);
      rotateX.set(-(y / box.height - 0.5) * tilt * 2);
    }
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const content = (
    <>
      {featured && <MatchGraphic />}
      <div className="flex items-start justify-between gap-4">
        <span className={`card-icon ${featured ? "card-icon-lg" : ""}`}>
          <AppIcon name={app.icon} />
        </span>
        <span className="badge">{app.tier}</span>
      </div>

      <div className={featured ? "mt-auto pt-16" : "mt-auto pt-10"}>
        <h3
          className={`font-display font-medium tracking-[-0.03em] text-ink ${
            featured ? "text-3xl sm:text-4xl" : "text-xl"
          }`}
        >
          {app.name}
        </h3>
        <p className={`mt-3 leading-relaxed text-mist ${featured ? "max-w-md text-lg" : "text-[0.95rem]"}`}>
          {app.description}
        </p>
        <p className="mt-6 text-sm font-semibold">
          {isLive ? (
            <span className="text-accent">Open {app.name}</span>
          ) : (
            <span className="shimmer-text">Coming soon</span>
          )}
        </p>
      </div>
    </>
  );

  return (
    <motion.li variants={cardReveal} className={`bento-cell ${featured ? "sm:col-span-2 lg:row-span-2" : ""}`}>
      <motion.div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ rotateX, rotateY, transformPerspective: 1100 }}
        className={`bento-card ${app.tier === "Pro" ? "card-pro" : "card-free"} ${isLive ? "" : "is-locked"}`}
      >
        {isLive ? (
          <Link href={appHref(app)} className="bento-inner">
            {content}
          </Link>
        ) : (
          <div className="bento-inner">{content}</div>
        )}
      </motion.div>
    </motion.li>
  );
}

// Decoration for the big card: two overlapping circles (resume and job)
// with a glowing overlap, hinting at what the app does. Desktop only.
function MatchGraphic() {
  return (
    <svg
      viewBox="0 0 400 300"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-6 hidden w-[44%] -translate-y-1/2 lg:block"
    >
      <defs>
        <radialGradient id="overlap" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r="105" fill="rgba(34,211,238,0.05)" stroke="rgba(34,211,238,0.55)" strokeWidth="1.2" />
      <circle cx="250" cy="150" r="105" fill="rgba(139,92,246,0.06)" stroke="rgba(167,139,250,0.55)" strokeWidth="1.2" />
      <ellipse cx="200" cy="150" rx="46" ry="86" fill="url(#overlap)" opacity="0.55" />
      <circle cx="200" cy="150" r="5" fill="#ecfeff" />
      {[[95, 110], [80, 175], [130, 225], [305, 100], [320, 190], [270, 230], [200, 90], [195, 205]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill={cx < 200 ? "#67e8f9" : cx > 200 ? "#c4b5fd" : "#ffffff"} />
      ))}
    </svg>
  );
}
