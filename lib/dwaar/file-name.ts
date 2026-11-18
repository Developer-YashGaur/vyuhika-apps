// A clean file name for the resume PDF, such as "Asha-Rao-Resume". Browsers use the page title as the suggested
// file name when "Save as PDF" is chosen, so the page title is set to this while printing.
export function resumeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${cleaned || "My"}-Resume`;
}

// The downloaded PDF's name: "Asha-Rao_Python-Backend-Developer.pdf" (person's name, then the role applied for).
export function resumePdfFileName(name: string, role: string): string {
  const clean = (text: string, max: number) =>
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/, "");
  const person = clean(name, 40) || "My-Resume";
  const job = clean(role, 50);
  return `${person}${job ? `_${job}` : ""}.pdf`;
}
