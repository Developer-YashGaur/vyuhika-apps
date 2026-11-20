"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNotificationCountsAction } from "@/app/apps/dwaar/actions";
import { badgeText, titleWithCount, type NotificationCounts } from "@/lib/dwaar/notifications";

// Dwaar's navigation with live notification numbers: unread chat items on "Chats", waiting requests on "Employee desk",
// and the count in the browser tab title. While the tab is in the background and the person turned on desktop alerts,
// a new unread item also shows a browser notification. The numbers are asked for every 15 seconds while the tab shows.

export type NavLink = { href: string; label: string; badge?: "unread" | "waiting" };

const POLL_MS = 15000;

export default function DwaarNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NotificationCounts | null>(null);
  const last = useRef(0);

  useEffect(() => {
    let stopped = false;
    async function load() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const next = await getNotificationCountsAction();
        if (stopped) return;
        setCounts(next);
      } catch {
        /* the numbers are a bonus */
      }
    }
    void load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [pathname]);

  // The count in the tab title, and a desktop alert when something new arrives in a background tab.
  useEffect(() => {
    const unread = counts?.unread ?? 0;
    document.title = titleWithCount(document.title, unread);
    if (unread > last.current && document.visibilityState === "hidden" && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Dwaar", { body: unread === 1 ? "You have 1 new chat update." : `You have ${unread} new chat updates.` });
      } catch {
        /* some browsers do not allow this */
      }
    }
    last.current = unread;
  }, [counts]);

  const number = (badge: NavLink["badge"]) => (badge === "unread" ? counts?.unread ?? 0 : badge === "waiting" ? counts?.waitingRequests ?? 0 : 0);

  const render = (l: NavLink) => {
    const n = number(l.badge);
    const text = badgeText(n);
    return (
      <Link key={l.href} href={l.href} aria-label={text ? `${l.label}, ${n} new` : undefined}>
        {l.label}
        {text && (
          <span className="dw-badge" aria-hidden="true">
            {text}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Dwaar" className="dw-nav">
        {links.map(render)}
      </nav>
      <details className="dw-menu">
        <summary>Menu{counts && counts.unread + counts.waitingRequests > 0 ? <span className="dw-badge" aria-hidden="true">{badgeText(counts.unread + counts.waitingRequests)}</span> : null}</summary>
        <nav aria-label="Dwaar menu" className="dw-menu-panel">
          {links.map(render)}
        </nav>
      </details>
    </>
  );
}
