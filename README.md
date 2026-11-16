<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/vyuhika-horizontal-color.svg">
    <img src="public/brand/vyuhika-horizontal-light.svg" alt="Vyuhika Apps" height="64">
  </picture>
</p>

Vyuhika Apps: a growing collection of useful AI tools, some free and some paid, built in public by Yash Gaur.
## Apps

| App | Status | Page | API |
|---|---|---|---|
| Resume Matcher (Free) | Live | `/apps/resume-matcher` | `/api/analyze` |
| Cover Letter Writer (Free) | Live | `/apps/cover-letter-writer` | `/api/cover-letter` |
| Interview Coach (Pro) | Coming soon | none yet | none yet |

The list on the home page lives in `lib/apps.ts`. The sitemap (`/sitemap.xml`) lists the home page and every live app, and `robots.txt` blocks `/api/` and `/dev/`.

## Environment variables

Put these in `.env.local` for local development, and in the Vercel project's Environment Variables for production. Never commit real values.

| Name | Required | What it's for |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key, used by the Resume Matcher (`/api/analyze`) and the Cover Letter Writer (`/api/cover-letter`). Secret. |
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
