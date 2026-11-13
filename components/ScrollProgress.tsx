"use client";

import { motion, useScroll, useSpring } from "framer-motion";

// Thin gradient bar at the very top that fills as you scroll down the page.
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return <motion.div aria-hidden="true" className="scroll-progress" style={{ scaleX }} />;
}
