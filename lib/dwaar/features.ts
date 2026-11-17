// Feature switches, read from the server's environment (.env.local locally, Vercel settings in production).
// They are not NEXT_PUBLIC_, so the browser never sees them.

// Paid Boost is OFF until a lawyer has confirmed that charging job seekers is fine. Turn on with DWAAR_BOOST_ENABLED=true.
export function boostPaymentsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DWAAR_BOOST_ENABLED?.trim().toLowerCase() === "true";
}
