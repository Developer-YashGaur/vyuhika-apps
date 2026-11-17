import type { ReactNode } from "react";
import CompanyMonogram from "@/components/dwaar/CompanyMonogram";

// A paper "visitor pass", like the one you get at a company reception.
// `stamp` is the status printed on it, for example "Waiting at reception".
export default function VisitorPass({
  number,
  company,
  title,
  meta,
  stamp,
  stampTone = "wait",
  tileName,
  children,
}: {
  number: string;
  company: string;
  title: string;
  meta?: string;
  stamp?: string;
  stampTone?: "wait" | "ok" | "closed";
  tileName?: string; // the name the round tile is made from (defaults to the company)
  children?: ReactNode;
}) {
  return (
    <article className="dw-pass">
      <div className="dw-pass-hole" aria-hidden="true" />
      <header className="dw-pass-head">
        <span className="dw-pass-label">Visitor pass</span>
        <span className="dw-pass-number">{number}</span>
      </header>
      <div className="dw-pass-body">
        <CompanyMonogram name={tileName ?? company} />
        <div className="min-w-0">
          <h3 className="dw-pass-title">{title}</h3>
          <p className="dw-pass-company">{company}</p>
          {meta && <p className="dw-pass-meta">{meta}</p>}
        </div>
      </div>
      {stamp && <p className={`dw-stamp dw-stamp-${stampTone}`}>{stamp}</p>}
      {children && <div className="dw-pass-foot">{children}</div>}
    </article>
  );
}
