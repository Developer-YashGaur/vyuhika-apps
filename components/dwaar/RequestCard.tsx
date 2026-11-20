import type { ReactNode } from "react";
import CompanyMonogram from "@/components/dwaar/CompanyMonogram";

// One request, shown as a card: company tile, job title, status, and a footer for details and actions.
export default function RequestCard({
  number,
  company,
  title,
  meta,
  status,
  tone = "wait",
  tileName,
  children,
}: {
  number: string;
  company: string;
  title: string;
  meta?: string;
  status?: string;
  tone?: "wait" | "ok" | "closed";
  tileName?: string; // the name the tile is made from (defaults to the company)
  children?: ReactNode;
}) {
  return (
    <article className="dw-card dw-req">
      <div className="dw-req-head">
        <CompanyMonogram name={tileName ?? company} />
        <div className="min-w-0 flex-1">
          <h3 className="dw-req-title dw-display" title={title}>
            {title}
          </h3>
          <p className="dw-req-sub" title={company}>
            {company}
          </p>
          <p className="dw-req-meta">{[meta, `Ref ${number}`].filter(Boolean).join(" · ")}</p>
        </div>
        {status && <span className={`dw-status dw-status-${tone}`}>{status}</span>}
      </div>
      {children && <div className="dw-req-foot">{children}</div>}
    </article>
  );
}
