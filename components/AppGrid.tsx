"use client";

import { motion } from "framer-motion";
import AppCard from "@/components/AppCard";
import { apps } from "@/lib/apps";

// Bento layout: the first app gets the big tile, the rest fill in around it.
// - Phones: one column.
// - Tablets: two columns (the big tile spans both; a last odd card spans both too).
// - Laptops (6 columns): the big tile takes 4 and the second card 2; the cards after that share the next row
//   (3 + 3, or one full-width card if the count is odd).
// - Very wide screens (137.5rem = 2200px and up): all cards sit in one row of 5 columns (big tile = two columns).
//   (rem on purpose: Tailwind orders px and rem breakpoints separately, and a px one would lose to the lg rules.)
// The class names are written out in full so Tailwind can find them.
// Cards reveal one after another when the grid scrolls into view.
function cellClass(index: number, total: number): string {
  if (index === 0) return "sm:col-span-2 lg:col-span-4 min-[137.5rem]:col-span-2";
  const others = total - 1;
  const lastOdd = others % 2 === 1 && index === total - 1; // the last card of an odd number of small cards
  const rest = total - 2; // cards after the second one
  const smWide = lastOdd ? "sm:col-span-2" : "";
  if (index === 1) return `${smWide} lg:col-span-2 min-[137.5rem]:col-span-1`;
  const lgSpan = rest % 2 === 1 && index === total - 1 ? "lg:col-span-6" : "lg:col-span-3";
  return `${smWide} ${lgSpan} min-[137.5rem]:col-span-1`;
}

export default function AppGrid() {
  return (
    <motion.ul
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: 0.12 }}
      className="mt-14 grid gap-5 sm:grid-cols-2 lg:auto-rows-[minmax(280px,auto)] lg:grid-cols-6 min-[137.5rem]:auto-rows-[minmax(clamp(360px,22vw,460px),auto)] min-[137.5rem]:grid-cols-5"
    >
      {apps.map((app, i) => (
        <AppCard key={app.slug} app={app} featured={i === 0} cellClass={cellClass(i, apps.length)} />
      ))}
    </motion.ul>
  );
}
