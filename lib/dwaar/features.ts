// Feature switches, read from the server's environment (.env.local locally, Vercel settings in production).
// They are not NEXT_PUBLIC_, so the browser never sees them.

// Paid Boost is OFF until a lawyer has confirmed that charging job seekers is fine. Turn on with DWAAR_BOOST_ENABLED=true.
export function boostPaymentsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DWAAR_BOOST_ENABLED?.trim().toLowerCase() === "true";
}

// Invite rewards are OFF until you switch them on. Turn on with DWAAR_INVITES_ENABLED=true here, and set
// invite_rewards_enabled to 'true' in the database table private.dwaar_config (the database pays out the credits).
export function inviteRewardsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DWAAR_INVITES_ENABLED?.trim().toLowerCase() === "true";
}

// The paid Plus pass is OFF until you switch it on (after the lawyer is happy). Turn on with DWAAR_PLAN_ENABLED=true.
export function planPaymentsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DWAAR_PLAN_ENABLED?.trim().toLowerCase() === "true";
}
