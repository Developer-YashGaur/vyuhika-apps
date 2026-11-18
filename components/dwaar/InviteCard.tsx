import RedeemInviteForm from "@/components/dwaar/RedeemInviteForm";
import { inviteLink, type InviteSummary } from "@/lib/dwaar/invites";

// Shown to candidates on the Dwaar home page, only when invite rewards are switched on.

export default function InviteCard({ summary, initialCode }: { summary: InviteSummary; initialCode?: string }) {
  return (
    <section className="dw-card dw-split mt-6" aria-labelledby="dw-invite-title">
      <div>
        <h2 id="dw-invite-title" className="dw-display text-xl font-medium">Invite a friend</h2>
        <p className="mt-2 leading-relaxed dw-muted">
          Share your code. When your friend sends their first referral request, you each get 10 credits.
        </p>
        <p className="mt-4 text-sm dw-muted">Your code</p>
        <p className="dw-display select-all text-2xl tracking-widest">{summary.code}</p>
        <p className="mt-2 break-all text-sm dw-muted">{inviteLink(summary.code)}</p>
        <p className="mt-4 text-sm">
          <span className="dw-chip dw-chip-good">Credits: {summary.credits}</span>
        </p>
      </div>
      <RedeemInviteForm initialCode={initialCode} />
    </section>
  );
}
