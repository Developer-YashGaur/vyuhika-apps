import { canWrite, writeHint } from "@/lib/cover-letter/form";

// The "Write my cover letter" button, the hint under it and the privacy line.
// The button is disabled until both boxes have a valid length.

type Props = {
  resume: string;
  jobDescription: string;
  onWrite: () => void;
};

export default function WriteButton({ resume, jobDescription, onWrite }: Props) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 text-center">
      <button
        type="button"
        onClick={onWrite}
        disabled={!canWrite(resume, jobDescription)}
        aria-describedby="write-hint"
        className="btn-glow btn-lg"
      >
        Write my cover letter
      </button>
      <p id="write-hint" className="text-sm text-mist">
        {writeHint(resume, jobDescription)}
      </p>
      {/* The icon sits inline so it stays next to the first word when the text wraps on phones. */}
      <p className="max-w-md px-1 text-[0.85rem] text-mist">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="mr-1.5 inline-block align-[-2px]">
          <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        Your text is sent securely to an AI service to write the letter. It is not stored by Vyuhika.
      </p>
    </div>
  );
}
