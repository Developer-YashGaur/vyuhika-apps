"use client";

// "Download PDF": opens the browser's print window with only the resume on the page. Choosing "Save as PDF" there
// gives a proper PDF file. It works in every browser, with no extra service.
export default function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="dw-btn dw-btn-primary">
      {label}
    </button>
  );
}
