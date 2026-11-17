// The words in the status emails (accepted, new chat message, reply). Kept apart from the template so the plain-text
// and the HTML versions always say the same thing. These emails never carry message text, resumes, scores or anybody's
// email address: they say what happened and link to the sign-in protected page.

export type StatusKind = "accepted" | "message" | "reply";

export type StatusData = { kind: StatusKind; requestId: string; toName: string; otherName: string; company: string; jobTitle: string };

export type StatusEmailContent = {
  subject: string;
  preview: string;
  heading: string;
  intro: string;
  roleLabel: string;
  jobTitle: string;
  company: string;
  buttonLabel: string;
  link: string;
  note: string;
  footer: string;
  text: string;
};

// A name comes from a person's profile. Keep it to one short plain line so it cannot break an email subject.
export function cleanName(raw: string, fallback = "Someone"): string {
  const name = raw.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return name || fallback;
}

export function chatUrl(assetBaseUrl: string, requestId: string): string {
  return `${assetBaseUrl.replace(/\/+$/, "")}/apps/dwaar/requests/${requestId}/chat`;
}

export function statusEmailContent(data: StatusData, assetBaseUrl: string): StatusEmailContent {
  const other = cleanName(data.otherName);
  const link = chatUrl(assetBaseUrl, data.requestId);
  const common = { roleLabel: "Role", jobTitle: data.jobTitle, company: data.company, link };
  let body: Omit<StatusEmailContent, "text" | "roleLabel" | "jobTitle" | "company" | "link">;

  if (data.kind === "accepted") {
    body = {
      subject: `${other} accepted your referral request at ${data.company}`,
      preview: `${other} accepted your request`,
      heading: "Your request was accepted",
      intro: `${other} works at ${data.company} and accepted your referral request. You can now send them one message.`,
      buttonLabel: "Open the chat",
      note: "Dwaar keeps email addresses and phone numbers private, so please keep the conversation inside the chat.",
      footer: "You get this email because you asked for a referral on Dwaar.",
    };
  } else if (data.kind === "message") {
    body = {
      subject: `${other} sent you a message on Dwaar`,
      preview: `${other} wrote to you about ${data.jobTitle}`,
      heading: "You have a new message",
      intro: `${other}, whose referral request you accepted, wrote to you. Sign in to read it.`,
      buttonLabel: "Read the message",
      note: "You can reply up to 3 times. Email addresses and phone numbers are never shared.",
      footer: `You get this email because you accepted a referral request at ${data.company} on Dwaar.`,
    };
  } else {
    body = {
      subject: `${other} replied to you on Dwaar`,
      preview: `${other} replied about ${data.jobTitle}`,
      heading: "You have a reply",
      intro: `${other} at ${data.company} replied to your message. Sign in to read it.`,
      buttonLabel: "Read the reply",
      note: "Email addresses and phone numbers are never shared on Dwaar.",
      footer: "You get this email because you asked for a referral on Dwaar.",
    };
  }

  const text = [
    body.heading,
    "",
    body.intro,
    "",
    `Role: ${data.jobTitle}`,
    `Company: ${data.company}`,
    "",
    `${body.buttonLabel}: ${link}`,
    "",
    body.note,
    "",
    body.footer,
    "",
    "Vyuhika Apps: Intelligence, built in public.",
  ].join("\n");
  return { ...body, ...common, text };
}
