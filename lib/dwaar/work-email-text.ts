// The words in the work-email code email. Kept apart from the template so the plain-text version and the
// HTML version always say the same thing.

export const WORK_EMAIL_CODE_SUBJECT = "Your Dwaar confirmation code";
export const CODE_MINUTES = 15;

export function workEmailCodeText(code: string, assetBaseUrl: string): string {
  return [
    "Confirm your work email on Dwaar",
    "",
    `Your code: ${code}`,
    "",
    `It works for ${CODE_MINUTES} minutes. Type it into the Dwaar page where you asked for it.`,
    "",
    "If you did not ask for this code, you can ignore this email. Nothing will happen.",
    "",
    "Vyuhika Apps: Intelligence, built in public.",
    assetBaseUrl,
  ].join("\n");
}
