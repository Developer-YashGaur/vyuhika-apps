// The words in the status emails (accepted, new chat message, reply). Kept apart from the template so the plain-text
// and the HTML versions always say the same thing. These emails never carry message text, resumes, scores or anybody's
// email address: they say what happened and link to the sign-in protected page.

export type StatusKind = "sent" | "accepted" | "message" | "reply" | "contact_asked" | "contact_answered";

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

export function requestsUrl(assetBaseUrl: string): string {
  return `${assetBaseUrl.replace(/\/+$/, "")}/apps/dwaar/requests`;
}

export function statusEmailContent(data: StatusData, assetBaseUrl: string): StatusEmailContent {
  const other = cleanName(data.otherName);
  const link = data.kind === "sent" ? requestsUrl(assetBaseUrl) : chatUrl(assetBaseUrl, data.requestId);
  const common = { roleLabel: "Role", jobTitle: data.jobTitle, company: data.company, link };
  let body: Omit<StatusEmailContent, "text" | "roleLabel" | "jobTitle" | "company" | "link">;

  if (data.kind === "sent") {
    body = {
      subject: `Your referral request was sent: ${data.jobTitle} at ${data.company}`,
      preview: `We sent your request to employees at ${data.company}`,
      heading: "Your request was sent",
      intro: `Hi ${cleanName(data.toName, "there")}, we sent your referral request to employees at ${data.company} who chose to receive requests. If nobody accepts in 24 hours, it goes to a few more employees there.`,
      buttonLabel: "See my requests",
      note: "We email you again when an employee accepts. Your resume is never shown to employees. You can cancel the request any time.",
      footer: "You get this email because you asked for a referral on Dwaar.",
    };
  } else if (data.kind === "accepted") {
    body = {
      subject: `${other} accepted your referral request at ${data.company}`,
      preview: `${other} accepted your request`,
      heading: "Your request was accepted",
      intro: `${other} works at ${data.company} and accepted your referral request. You can now send them one message.`,
      buttonLabel: "Open the chat",
      note: "Phone numbers and emails stay private. After you write, the employee can ask for them in the chat, and you choose whether to share.",
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
  } else if (data.kind === "contact_asked") {
    body = {
      subject: `${other} asked for your contact details on Dwaar`,
      preview: `${other} asked a question about ${data.jobTitle}`,
      heading: "A contact request is waiting",
      intro: `${other} at ${data.company} asked for your phone number or email in the chat. You choose whether to share.`,
      buttonLabel: "Open the chat",
      note: "Your phone number and email stay private unless you choose Share. You can decline.",
      footer: "You get this email because you asked for a referral on Dwaar.",
    };
  } else if (data.kind === "contact_answered") {
    body = {
      subject: `${other} answered your contact request on Dwaar`,
      preview: `${other} answered your question about ${data.jobTitle}`,
      heading: "Your contact request was answered",
      intro: `${other} answered the contact request you sent in the chat. Sign in to see the answer.`,
      buttonLabel: "Open the chat",
      note: "Phone numbers and email addresses stay private. They are shown only inside Dwaar, never in an email.",
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
