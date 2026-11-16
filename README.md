<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/vyuhika-horizontal-color.svg">
    <img src="public/brand/vyuhika-horizontal-light.svg" alt="Vyuhika Apps" height="64">
  </picture>
</p>

Vyuhika Apps: a growing collection of useful digital tools, some free and some paid, built in public by Yash Gaur.
## Apps

| App | Category | Pricing | Status | Where | API |
|---|---|---|---|---|---|
| Resume Matcher | Careers | Free | Live | `/apps/resume-matcher` | `/api/analyze` |
| Cover Letter Writer | Careers | Free | Live | `/apps/cover-letter-writer` | `/api/cover-letter` |
| Koshvia | Finance | Free + Pro | Live, external | https://koshvia.vyuhika.com (opens in a new tab) | none (a separate site) |
| Interview Coach | Careers | Pro | Coming soon | none yet | none yet |

The list on the home page lives in `lib/apps.ts`. An app with an `externalUrl` (like Koshvia) is built and hosted somewhere else: its card opens that site in a new tab, it has no page or API here, it is not in the sitemap, and this code never calls it. The sitemap (`/sitemap.xml`) lists the home page and every live app on this site, and `robots.txt` blocks `/api/` and `/dev/`.

## Search visibility (SEO)

- **Text under each tool** (what it does, how it works, who it is for, what it does not do, FAQ): written in `lib/app-content.ts` and shown by `components/AppGuide.tsx`. It is plain server-rendered HTML, so it is in the page source without JavaScript. Every sentence must stay true to the code (file size, character limits, daily and per-minute limits); `tests/search-visibility.test.tsx` checks the numbers against the code. Update the `updated` date there when you change a page's words: the sitemap uses it as `lastModified`.
- **Structured data (JSON-LD)** is built in `lib/structured-data.ts` and printed by `components/JsonLd.tsx`:
  - Home page: `WebSite` and `Organization` (name "Vyuhika Apps", the site URL, and the logo `/brand/kit/icon-512.png` from `BRAND_FILES.logo`).
  - Each app page: `SoftwareApplication` (category, operating system "Web", a free offer with price `0`), `FAQPage` (the same FAQ as the page, read from `lib/app-content.ts`) and `BreadcrumbList`.
  - The price currency is **INR** (`PRICE_CURRENCY` in `lib/structured-data.ts`). Change it there if you want USD or another code.
  - Never add ratings, reviews or counts. We have none, and a test fails if they appear.
- **Titles, descriptions, canonical links and share cards** are in `lib/metadata.ts` (`homeMetadata`, `resumeMatcherMetadata`, `coverLetterWriterMetadata`). Titles stay about 60 characters or less and descriptions about 160 or less (tested).
- **Sitemap** (`app/sitemap.ts`): `lastModified` comes from the dates in `lib/app-content.ts` (`HOME_UPDATED` for the home page), not from the build date.
- **Internal links**: the footer lists every live app on this site, and each app page ends with a "More tools" row (`components/MoreTools.tsx`) that also links to Koshvia in a new tab.
- When you add an app: add it to `lib/apps.ts`, give it an entry in `lib/app-content.ts`, a metadata export in `lib/metadata.ts`, and use `<JsonLd data={appStructuredData(slug)} />`, `<AppGuide />` and `<MoreTools />` on its page.
- Check the new text and screenshots: `npm run build`, `npm start`, then `URL=http://localhost:3000 npm run screenshots:guide`.

## Privacy and analytics

We use cookie-free Vercel analytics to count page views, countries, devices, referrers and page speed, plus five fixed events (app name, tone, length, feedback type or resume file type only; custom events show on Vercel's Pro plan), and we never send resume, job, letter, highlight, company or role text, file names, email addresses or typed links.

## Environment variables

Put these in `.env.local` for local development, and in the Vercel project's Environment Variables for production. Never commit real values.

| Name | Required | What it's for |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key, used by the Resume Matcher (`/api/analyze`) and the Cover Letter Writer (`/api/cover-letter`). Secret. |
| `GOOGLE_SITE_VERIFICATION` | No | The code from Google Search Console (the `content` of the verification meta tag). Adds `<meta name="google-site-verification">` only when set. |
| `GEMINI_MODEL` | No | Gemini model name. Defaults to `gemini-3.5-flash-lite`. |
| `GEMINI_THINKING_LEVEL` | No | `minimal`, `low`, `medium` or `high`. Not sent by default: Google's docs say the default Gemini 3.x Flash-Lite models already think at `minimal`, the lowest level. A higher level is slower. |
| `GEMINI_FALLBACK_MODEL` | No | Tried once if the main model keeps failing with temporary errors (HTTP 500, 503, 504 or a short 429). Defaults to `gemini-3.1-flash-lite`. |
| `RESEND_API_KEY` | Yes | Resend API key, used to send feedback emails. Secret. |
| `EMAIL_FROM` | Yes | Sender, for example `Vyuhika Apps <no_reply@vyuhika.com>`. Must use a domain verified in Resend. |
| `FEEDBACK_TO_EMAIL` | Yes | Inbox that receives feedback notifications, for example `support@vyuhika.com`. |
| `EMAIL_ASSET_BASE_URL` | Yes | Public site that serves the email images in `public/email/`, for example `https://apps.vyuhika.com`. |

If any email variable is missing, the feedback form shows a friendly "try again later" message and nothing is sent.

## Feedback emails

- Templates: `components/emails/` (React Email). They're rendered to HTML, with a plain-text version alongside.
- Preview in the browser (dev only, returns 404 in production): run `npm run dev`, then open http://localhost:3000/dev/emails.
- Send yourself a real test of each template: `npm run email:test` (sends to `FEEDBACK_TO_EMAIL`), or `npm run email:test -- you@example.com`.
- Header images: `npm run email:images` regenerates `public/email/header.png` and `public/email/header.gif`.
- Limits: each visitor can send 3 feedback messages per 10 minutes, and at most 50 confirmation emails go out per day across all visitors (support is still notified after that). These counts are kept in memory, so they reset whenever a server instance restarts.

Images in real emails load from `EMAIL_ASSET_BASE_URL`, so they only appear in inboxes after `public/email/` is deployed to that site. Until then, test emails show the alt text in place of the images.
