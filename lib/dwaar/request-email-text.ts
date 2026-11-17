// The words in the "a candidate is waiting" email. Kept apart from the template so the plain-text version and
// the HTML version always say the same thing. It names only the role and the company: no candidate details.

export const NEW_REQUEST_SUBJECT = "Someone is asking for a referral at your company on Dwaar";

export function inboxUrl(assetBaseUrl: string): string {
  return `${assetBaseUrl.replace(/\/+$/, "")}/apps/dwaar/inbox`;
}

export function newRequestText(jobTitle: string, company: string, assetBaseUrl: string): string {
  return [
    `A candidate asked for a referral at ${company}`,
    "",
    `Role: ${jobTitle}`,
    "",
    "Open your employee desk to see who is asking. You decide whether to accept. If you accept, the candidate's email is shared with you.",
    inboxUrl(assetBaseUrl),
    "",
    "You get this email because you are a confirmed referral provider at this company on Dwaar. We send at most 3 of these a day.",
    "",
    "Vyuhika Apps: Intelligence, built in public.",
  ].join("\n");
}
