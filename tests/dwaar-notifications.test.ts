import { describe, expect, it } from "vitest";
import { askableKinds, buildTimeline, type ContactView } from "@/lib/dwaar/chat-timeline";
import { badgeText, getNotificationCounts, markChatRead, titleWithCount } from "@/lib/dwaar/notifications";

const msgs = [
  { id: 1, mine: false, body: "Hi", at: "2026-11-20T10:00:00Z" },
  { id: 2, mine: true, body: "Hello", at: "2026-11-20T10:05:00Z" },
];
const phoneShared: ContactView = { kind: "phone", status: "shared", value: "+91 98765 43210", askedAt: "2026-11-20T10:02:00Z", answeredAt: "2026-11-20T10:06:00Z" };
const emailPending: ContactView = { kind: "email", status: "pending", value: null, askedAt: "2026-11-20T10:07:00Z", answeredAt: null };

describe("chat timeline", () => {
  it("puts messages and phone/email events in the order they happened", () => {
    const t = buildTimeline(msgs, [phoneShared, emailPending], true, "Ravi");
    expect(t.map((e) => e.key)).toEqual(["m1", "c-phone-asked", "m2", "c-phone-answered", "c-email-asked"]);
  });
  it("words each event for the candidate, who can answer a pending question", () => {
    const t = buildTimeline([], [phoneShared, emailPending], true, "Ravi");
    expect(t[0]).toMatchObject({ text: "Ravi asked for your phone number.", canAnswer: false });
    expect(t[1]).toMatchObject({ text: "You shared your phone number.", value: null });
    expect(t[2]).toMatchObject({ text: "Ravi asked for your email.", canAnswer: true });
  });
  it("shows the shared number only to the employee", () => {
    const t = buildTimeline([], [phoneShared], false, "Asha");
    expect(t[0]).toMatchObject({ text: "You asked Asha for their phone number.", canAnswer: false });
    expect(t[1]).toMatchObject({ text: "Asha shared their phone number.", value: "+91 98765 43210" });
  });
  it("words a declined answer", () => {
    const declined: ContactView = { ...phoneShared, status: "declined", value: null };
    expect(buildTimeline([], [declined], false, "Asha")[1]).toMatchObject({ text: "Asha chose not to share their phone number.", value: null });
    expect(buildTimeline([], [declined], true, "Ravi")[1]).toMatchObject({ text: "You chose not to share your phone number." });
  });
  it("offers only the kinds not asked yet", () => {
    expect(askableKinds([])).toEqual(["phone", "email"]);
    expect(askableKinds([phoneShared])).toEqual(["email"]);
    expect(askableKinds([phoneShared, emailPending])).toEqual([]);
  });
});

describe("notifications", () => {
  it("words the badge and the tab title", () => {
    expect(badgeText(0)).toBe("");
    expect(badgeText(3)).toBe("3");
    expect(badgeText(25)).toBe("9+");
    expect(titleWithCount("Your chats", 2)).toBe("(2) Your chats");
    expect(titleWithCount("(2) Your chats", 5)).toBe("(5) Your chats");
    expect(titleWithCount("(2) Your chats", 0)).toBe("Your chats");
  });
  it("reads the counts, and returns null when the database refuses", async () => {
    const db = (reply: unknown) => ({ rpc: async () => reply }) as never;
    expect(await getNotificationCounts(db({ data: [{ out_unread: 4, out_unread_chats: 2, out_waiting_requests: 1 }], error: null }))).toEqual({ unread: 4, unreadChats: 2, waitingRequests: 1 });
    expect(await getNotificationCounts(db({ data: null, error: { code: "42501" } }))).toBe(null);
  });
  it("never throws when marking a chat read fails", async () => {
    await markChatRead({ rpc: async () => ({ error: { code: "x" } }) } as never, "r");
  });
});
