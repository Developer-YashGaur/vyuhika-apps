import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MATCHER_PATH } from "@/lib/feedback/rules";
import { sampleResume } from "@/lib/samples";

// Tests the real /api/feedback route with the Resend email call faked (nothing is sent).

type FakeSend = (email: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const sendMock = vi.fn<FakeSend>(async () => ({ data: { id: "fake" }, error: null }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { POST } = await import("@/app/api/feedback/route");

const SECRET_MESSAGE = "My private feedback text that must never be logged.";

const body = {
  type: "idea",
  message: SECRET_MESSAGE,
  email: "",
  website: "",
  context: { path: "/", timestamp: "2026-11-13T10:00:00.000Z", browser: "Firefox on Linux, 1280×800 window" },
};

let ipCounter = 0;
function post(data: unknown, ip = `10.1.0.${++ipCounter}`) {
  return POST(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: typeof data === "string" ? data : JSON.stringify(data),
    }),
  );
}

let errorLog: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test_fake_key");
  vi.stubEnv("FEEDBACK_TO_EMAIL", "support@vyuhika.com");
  vi.stubEnv("EMAIL_FROM", "Vyuhika Apps <no_reply@vyuhika.com>");
  vi.stubEnv("EMAIL_ASSET_BASE_URL", "https://apps.vyuhika.com");
  sendMock.mockClear();
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/feedback", () => {
  it("sends valid feedback to FEEDBACK_TO_EMAIL from EMAIL_FROM, as HTML and plain text", async () => {
    const response = await post(body);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const email = sendMock.mock.calls[0][0];
    expect(email.from).toBe("Vyuhika Apps <no_reply@vyuhika.com>");
    expect(email.to).toEqual(["support@vyuhika.com"]);
    expect(email.subject).toMatch(/^\[Vyuhika\] Idea: /);
    expect(email.text).toContain(SECRET_MESSAGE);
    expect(email.html).toContain("New feedback");
  });

  it("also sends a confirmation when the visitor leaves an email", async () => {
    const response = await post({ ...body, email: "priya@example.com" });
    expect(response.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[1][0]).toMatchObject({ to: ["priya@example.com"], replyTo: "support@vyuhika.com" });
  });

  it("returns the generic error when EMAIL_FROM is missing", async () => {
    vi.stubEnv("EMAIL_FROM", "");
    expect((await post(body)).status).toBe(503);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("pretends to accept a bot (honeypot filled) but sends nothing", async () => {
    const response = await post({ ...body, website: "http://spam.example" });
    expect(response.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a request that tries to include resume text", async () => {
    const response = await post({
      ...body,
      type: "wrong-result",
      context: { ...body.context, path: MATCHER_PATH },
      resume: sampleResume,
    });
    expect(response.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("allows 3 messages per 10 minutes per visitor", async () => {
    for (let i = 0; i < 3; i++) expect((await post(body, "198.51.100.7")).status).toBe(200);
    const response = await post(body, "198.51.100.7");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect((await response.json()).error.message).toMatch(/try again in a few minutes/);
    expect(sendMock).toHaveBeenCalledTimes(3);
  });

  it("rejects oversized payloads", async () => {
    const response = await post({ ...body, message: "a".repeat(20_000) });
    expect(response.status).toBe(413);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns a safe generic error when the env variables are missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const response = await post(body);
    expect(response.status).toBe(503);
    expect((await response.json()).error.message).toBe(
      "We couldn't send your feedback right now. Please try again later.",
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns the generic error when Resend rejects the email, and never logs the message", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: "bad" } });
    const response = await post(body);
    expect(response.status).toBe(503);
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).toContain("validation_error");
    expect(logged).not.toContain(SECRET_MESSAGE);
  });
});
