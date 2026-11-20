// The "What would you like to do next?" cards shown after a Boost. The recommended card comes first:
// with a good match score that is "continue with my request"; with a lower score it is "download your resume".
export type NextChoice = {
  id: "request" | "jobs" | "pdf" | "another";
  title: string;
  text: string;
  action: string;
  href: string;
  download: boolean;
  recommended: boolean;
};

export function boostChoices(requestId: string, good: boolean): NextChoice[] {
  const id = encodeURIComponent(requestId);
  const all: NextChoice[] = [
    {
      id: "request",
      title: "Continue with my request",
      text: "Go back to your requests. Employees at the company see your match score and can accept.",
      action: "Open my requests",
      href: "/apps/dwaar/requests",
      download: false,
      recommended: good,
    },
    {
      id: "jobs",
      title: "Find similar jobs",
      text: "Use this resume to look for other roles that fit you.",
      action: "Find jobs",
      href: "/apps/dwaar/find",
      download: false,
      recommended: false,
    },
    {
      id: "pdf",
      title: "Download as PDF",
      text: "A clean PDF named with your name and the role, ready to attach anywhere.",
      action: "Download PDF",
      href: `/apps/dwaar/requests/${id}/boost/pdf`,
      download: true,
      recommended: !good,
    },
    {
      id: "another",
      title: "Ask for another referral",
      text: "Start a new request for a different job or company.",
      action: "New request",
      href: "/apps/dwaar/requests/new",
      download: false,
      recommended: false,
    },
  ];
  return [...all.filter((c) => c.recommended), ...all.filter((c) => !c.recommended)];
}
