"use client";

// "Download PDF": opens the browser's print window with only the resume on the page. Choosing "Save as PDF" there
// gives a proper PDF file. The browser suggests the page title as the file name, so the title is set to the clean
// file name while printing and put back afterwards.
export default function PrintButton({ fileName, label = "Download PDF" }: { fileName: string; label?: string }) {
  function print() {
    const originalTitle = document.title;
    document.title = fileName;
    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }
  return (
    <button type="button" onClick={print} className="dw-btn dw-btn-primary">
      {label}
    </button>
  );
}
