import { BOOST_CREDIT_COST } from "@/lib/dwaar/credit-boost";
import { PLAN_CREDITS, PLAN_PRICE_RUPEES } from "@/lib/dwaar/plan";

// What the Credits page shows. Every way to get or use credits is always listed. When one is switched off it is shown
// greyed out with a reason, so people never wonder where it went. Pure logic, so it is easy to test.

export type CreditSwitches = { invites: boolean; plan: boolean; boost: boolean };

export type CreditWay = {
  id: "invite" | "plus" | "boost";
  title: string;
  detail: string;
  available: boolean;
  // Shown when available is false: why, and what happens next.
  reason: string | null;
  href: string;
  action: string;
};

export function creditWays(on: CreditSwitches): { earn: CreditWay[]; spend: CreditWay[] } {
  return {
    earn: [
      {
        id: "invite",
        title: "Invite a friend",
        detail: "You and your friend each get 1 credit when they send their first referral request.",
        available: on.invites,
        reason: on.invites ? null : "Invite rewards are not open yet. We will switch them on soon.",
        href: "/apps/dwaar",
        action: "Get my invite code",
      },
      {
        id: "plus",
        title: "Dwaar Plus pass",
        detail: `${PLAN_CREDITS} credits come with the ₹${PLAN_PRICE_RUPEES} pass, along with more daily resume checks.`,
        available: on.plan,
        reason: on.plan ? null : "Dwaar Plus is not open yet. Nothing can be bought right now.",
        href: "/apps/dwaar/plus",
        action: "See Dwaar Plus",
      },
    ],
    spend: [
      {
        id: "boost",
        title: "Boost a request",
        detail: `${BOOST_CREDIT_COST} credits get you a better resume, profile and LinkedIn tips for one request.`,
        available: on.boost || on.invites || on.plan,
        reason: on.boost || on.invites || on.plan ? null : "Boost is not open yet.",
        href: "/apps/dwaar/requests",
        action: "Choose a request",
      },
    ],
  };
}
