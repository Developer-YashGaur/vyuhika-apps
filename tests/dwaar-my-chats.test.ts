import { describe, expect, it } from "vitest";
import { chatPreview, listMyChats } from "@/lib/dwaar/my-chats";

const row = { out_request_id: "r1", out_job_title: "Dev", out_company_name: "Acme", out_other_name: "Ravi", out_is_candidate: true, out_last_body: "Hello   there", out_last_at: "2026-11-20T10:00:00Z", out_last_mine: false, out_message_count: 3, out_accepted_at: "2026-11-19T10:00:00Z" };
const db = (reply: unknown) => ({ rpc: async () => reply }) as never;

describe("my chats", () => {
  it("maps the database rows", async () => {
    const chats = await listMyChats(db({ data: [row], error: null }));
    expect(chats[0]).toMatchObject({ requestId: "r1", otherName: "Ravi", isCandidate: true, messageCount: 3 });
  });
  it("returns an empty list when the database refuses", async () => {
    expect((await listMyChats(db({ data: null, error: { code: "42501" } }))).length).toBe(0);
  });
  it("words the preview", () => {
    expect(chatPreview({ lastBody: "Hello   there", lastMine: false, otherName: "Ravi" })).toBe("Ravi: Hello there");
    expect(chatPreview({ lastBody: "Hi", lastMine: true, otherName: "Ravi" })).toBe("You: Hi");
    expect(chatPreview({ lastBody: null, lastMine: null, otherName: "Ravi" })).toBe("No messages yet. Say hello.");
    expect(chatPreview({ lastBody: "x".repeat(300), lastMine: true, otherName: "R" }, 20).length).toBeLessThanOrEqual(26);
  });
});
