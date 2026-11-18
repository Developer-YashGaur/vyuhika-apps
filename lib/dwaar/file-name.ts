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
