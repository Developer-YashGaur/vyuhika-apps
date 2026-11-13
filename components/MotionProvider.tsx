"use client";

import { MotionConfig } from "framer-motion";

// Tells every Framer Motion animation to respect the visitor's
// "reduce motion" setting (it turns movement into simple fades).
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
