import Link from "next/link";

export default function DwaarFooter() {
  return (
    <footer className="dw-footer">
      <div className="dw-wrap dw-footer-inner">
        <p>Dwaar, a product of Vyuhika. Intelligence, built in public.</p>
        <p className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/apps/dwaar/privacy">Dwaar privacy notice</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refunds">Refunds</Link>
          <Link href="/contact">Contact</Link>
          <a href="mailto:support@vyuhika.com">support@vyuhika.com</a>
          <Link href="/">Vyuhika Apps</Link>
        </p>
      </div>
    </footer>
  );
}
