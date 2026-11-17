// After signing in, the person is sent back to a page on this site. The address comes from the URL,
// so we only accept Dwaar pages. Anything else (another site, a strange path) goes to the Dwaar home.

const HOME = "/apps/dwaar";

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith(HOME)) return HOME;
  if (next.startsWith("//") || next.includes("\\") || next.includes("://")) return HOME;
  const rest = next.slice(HOME.length);
  // "/apps/dwaarX" is a different page, not a Dwaar page.
  if (rest !== "" && !rest.startsWith("/") && !rest.startsWith("?")) return HOME;
  return next;
}
