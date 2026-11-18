// Google Tag Manager. The container id is public (it appears in every page that uses it), so it is not a secret.
export const GTM_ID = "GTM-P57GKTXV";

// The script that starts Tag Manager: the standard snippet, plus the small `gtag` helper from the snippet we were given.
export const GTM_INIT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});`;

export const GTM_SRC = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;

// Pages where Tag Manager is NOT loaded: Dwaar's pages behind sign-in (profile, requests, chat, inbox, find jobs, plus,
// privacy). They show people's names, resumes, chats and contact details, and Tag Manager can run any tag the container
// has, so those pages keep it out. Dwaar's public front page (/apps/dwaar) and every other page are included.
export function gtmAllowedOn(pathname: string | null): boolean {
  if (!pathname) return true;
  return !/^\/apps\/dwaar\/.+/.test(pathname);
}
