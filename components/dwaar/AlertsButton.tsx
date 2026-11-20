"use client";

import { useState, useSyncExternalStore } from "react";

// "Turn on desktop alerts": asks the browser for permission to show a notification when a chat update arrives while this
// tab is in the background. It only works while Dwaar is open in a tab (there are no push messages when it is closed).
export default function AlertsButton() {
  // The browser's current permission (null while the page is still being built on the server).
  const current = useSyncExternalStore(
    () => () => {},
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => null,
  );
  const [changed, setChanged] = useState<NotificationPermission | null>(null);
  const permission = changed ?? current;
  if (permission === null || permission === "unsupported") return null;
  if (permission === "granted") return <p className="dw-ok-text text-sm">Desktop alerts are on while Dwaar is open in a tab.</p>;
  if (permission === "denied") return <p className="dw-muted text-sm">Desktop alerts are blocked in your browser settings.</p>;
  return (
    <button type="button" className="dw-btn dw-btn-quiet dw-btn-sm" onClick={async () => setChanged(await Notification.requestPermission())}>
      Turn on desktop alerts
    </button>
  );
}
