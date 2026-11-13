"use client";

import { motion } from "framer-motion";
import AppCard from "@/components/AppCard";
import { apps } from "@/lib/apps";

// Bento layout: the first app gets the big tile, the rest fill in beside it.
// On very wide screens all cards sit in one row (big tile = two columns).
// Cards reveal one after another when the grid scrolls into view.
export default function AppGrid() {
  return (
    <motion.ul
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: 0.12 }}
      className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[repeat(2,minmax(260px,auto))] 2xl:grid-cols-4 2xl:grid-rows-[minmax(clamp(360px,22vw,460px),auto)]"
    >
      {apps.map((app, i) => (
        <AppCard key={app.slug} app={app} featured={i === 0} />
      ))}
    </motion.ul>
  );
}
