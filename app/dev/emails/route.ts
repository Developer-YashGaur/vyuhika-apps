import { buildConfirmationEmail, buildNotificationEmail } from "@/lib/feedback/emails";
import { sampleFeedback } from "@/lib/feedback/email-samples";

// Dev-only preview of the feedback emails: http://localhost:3000/dev/emails
// Blocked in production builds (including Vercel previews), where it answers 404.

const templates = ["notification", "confirmation"] as const;
const samples = ["bug", "wrong-result"] as const;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const template = url.searchParams.get("template");
  const sample = url.searchParams.get("sample") === "bug" ? "bug" : "wrong-result";
  const format = url.searchParams.get("format");

  if (!templates.includes(template as (typeof templates)[number])) {
    // A simple index page with links to every preview.
    const links = templates
      .flatMap((t) =>
        samples.map(
          (s) =>
            `<li><a href="?template=${t}&sample=${s}">${t}, ${s}</a> (<a href="?template=${t}&sample=${s}&format=text">plain text</a>)</li>`,
        ),
      )
      .join("");
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Email previews</title><body style="font-family:system-ui;background:#050816;color:#eef2fb;padding:32px"><h1>Email previews</h1><ul style="line-height:2">${links}</ul><p style="color:#aab4cf">Images load from this dev server here. In real emails they load from EMAIL_ASSET_BASE_URL, so they only appear once deployed.</p></body>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Load images from this dev server, since they aren't deployed yet.
  const feedback = sampleFeedback[sample];
  const email =
    template === "notification"
      ? await buildNotificationEmail(feedback, url.origin, new Date("2026-11-13T10:52:14.000Z"))
      : await buildConfirmationEmail(feedback, url.origin);

  if (format === "text") {
    return new Response(`Subject: ${email.subject}\n\n${email.text}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(email.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
