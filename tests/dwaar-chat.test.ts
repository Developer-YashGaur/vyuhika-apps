import { describe, expect, it } from "vitest";
import { CHAT_MESSAGES, MESSAGE_MAX, checkMessage, closeChat, getChat, listClosedChatIds, sendMessage } from "@/lib/dwaar/chat";

function fakeDb(replies: Record<string, { data: unknown; error: { code?: string } | null }>) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  return { calls, db: { rpc: async (name: string, args: Record<string, unknown>) => (calls.push({ name, args }), replies[name]) } as never };
}

describe("checkMessage", () => {
  it("accepts a normal message and trims it", () => {
    expect(checkMessage("  Hello, I applied for the role.  ")).toEqual({ ok: true, text: "Hello, I applied for the role." });
  });
  it("refuses empty and too long messages", () => {
    expect(checkMessage("   ")).toEqual({ ok: false, message: CHAT_MESSAGES.empty });
    expect(checkMessage(undefined)).toEqual({ ok: false, message: CHAT_MESSAGES.empty });
    expect(checkMessage("x".repeat(MESSAGE_MAX + 1))).toEqual({ ok: false, message: CHAT_MESSAGES.tooLong });
  });
  it("refuses emails and phone numbers", () => {
    expect(checkMessage("write to me at ravi@gmail.com")).toEqual({ ok: false, message: CHAT_MESSAGES.contact });
    expect(checkMessage("call +91 98765 43210")).toEqual({ ok: false, message: CHAT_MESSAGES.contact });
    expect(checkMessage("9876543210")).toEqual({ ok: false, message: CHAT_MESSAGES.contact });
  });
  it("allows short numbers like years and job ids", () => {
    expect(checkMessage("I have 5 years of experience, job id 4521.").ok).toBe(true);
  });
});

describe("sendMessage", () => {
  it("sends the checked text to the database", async () => {
    const { db, calls } = fakeDb({ dwaar_send_message: { data: "sent", error: null } });
    expect(await sendMessage(db, "r1", " hi there ")).toEqual({ ok: true });
    expect(calls[0].args).toEqual({ p_request_id: "r1", p_body: "hi there" });
  });
  it("does not call the database for a bad message", async () => {
    const { db, calls } = fakeDb({});
    const result = await sendMessage(db, "r1", "mail me a@b.co");
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
  it("turns the database answers into sentences", async () => {
    for (const status of ["not_yet", "limit", "not_allowed", "closed"] as const) {
      const { db } = fakeDb({ dwaar_send_message: { data: status, error: null } });
      expect(await sendMessage(db, "r1", "hello")).toEqual({ ok: false, message: CHAT_MESSAGES[status] });
    }
    const { db } = fakeDb({ dwaar_send_message: { data: null, error: { code: "XX" } } });
    expect(await sendMessage(db, "r1", "hello")).toEqual({ ok: false, message: CHAT_MESSAGES.failed });
  });
});

describe("getChat", () => {
  it("returns null when the person has no access", async () => {
    const { db } = fakeDb({ dwaar_chat_info: { data: [], error: null }, dwaar_chat_messages: { data: [], error: null }, dwaar_closed_chats: { data: [], error: null } });
    expect(await getChat(db, "r1")).toBeNull();
  });
  it("returns the header and the messages", async () => {
    const info = { out_job_title: "Dev", out_company_name: "Acme", out_other_name: "Meera", out_is_candidate: true, out_can_send: true };
    const { db } = fakeDb({ dwaar_chat_info: { data: [info], error: null }, dwaar_chat_messages: { data: [{ out_id: 1, out_mine: true, out_body: "hi", out_created_at: "x" }], error: null }, dwaar_closed_chats: { data: [], error: null } });
    const chat = await getChat(db, "r1");
    expect(chat?.info.out_other_name).toBe("Meera");
    expect(chat?.messages).toHaveLength(1);
    expect(chat?.closed).toBe(false);
    expect(chat?.info.out_can_send).toBe(true);
  });
  it("a closed chat can be read but not written in", async () => {
    const info = { out_job_title: "Dev", out_company_name: "Acme", out_other_name: "Meera", out_is_candidate: true, out_can_send: true };
    const { db } = fakeDb({ dwaar_chat_info: { data: [info], error: null }, dwaar_chat_messages: { data: [], error: null }, dwaar_closed_chats: { data: ["r1", "r2"], error: null } });
    const chat = await getChat(db, "r1");
    expect(chat?.closed).toBe(true);
    expect(chat?.info.out_can_send).toBe(false);
  });
});

describe("closing a chat", () => {
  it("is true only when the database closed it", async () => {
    expect(await closeChat(fakeDb({ dwaar_close_chat: { data: true, error: null } }).db, "r1")).toBe(true);
    expect(await closeChat(fakeDb({ dwaar_close_chat: { data: false, error: null } }).db, "r1")).toBe(false);
    expect(await closeChat(fakeDb({ dwaar_close_chat: { data: null, error: { code: "42501" } } }).db, "r1")).toBe(false);
  });
  it("lists the closed chat ids", async () => {
    const ids = await listClosedChatIds(fakeDb({ dwaar_closed_chats: { data: ["a", "b"], error: null } }).db);
    expect(ids.has("a")).toBe(true);
    expect(ids.has("z")).toBe(false);
  });
});

import { getChatResume, toMessageViews } from "@/lib/dwaar/chat";

describe("live chat helpers", () => {
  it("turns database messages into plain data for the browser", () => {
    expect(toMessageViews([{ out_id: 7, out_mine: true, out_body: "hi", out_created_at: "2026-11-20T10:00:00Z" }])).toEqual([{ id: 7, mine: true, body: "hi", at: "2026-11-20T10:00:00Z" }]);
  });
  it("reads resume sharing, and returns null when the database refuses or returns nothing", async () => {
    const rpc = (reply: unknown) => ({ rpc: async () => reply }) as never;
    const shared = await getChatResume(rpc({ data: [{ out_is_candidate: false, out_shared: true, out_has_resume: true, out_path: "u/r.pdf" }], error: null }), "r");
    expect(shared).toEqual({ isCandidate: false, shared: true, hasResume: true, path: "u/r.pdf" });
    expect(await getChatResume(rpc({ data: [], error: null }), "r")).toBe(null);
    expect(await getChatResume(rpc({ data: null, error: { code: "42501" } }), "r")).toBe(null);
  });
});
