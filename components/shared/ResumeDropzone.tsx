"use client";

import { useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE, ResumeFileError, readResumeFile } from "@/lib/resume-file";

// Drag-and-drop (or click to browse) for a resume file. The file is read in the
// browser and its text is handed to `onText`; nothing is uploaded anywhere.

type Props = {
  fileName: string | null;
  onText: (text: string, fileName: string) => void;
  onRemove: () => void;
};

export default function ResumeDropzone({ fileName, onText, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      onText(await readResumeFile(file), file.name);
    } catch (err) {
      setError(
        err instanceof ResumeFileError
          ? err.message
          : "We couldn't read that file. Please try another file or paste the text instead.",
      );
    } finally {
      setReading(false);
      // Clear the input so choosing the same file again still triggers a change.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openPicker() {
    if (!reading) inputRef.current?.click();
  }

  // Once a file is loaded, show its name with a remove button instead of the drop zone.
  if (fileName) {
    return (
      <div className="file-chip">
        <FileIcon />
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={fileName}>
          {fileName}
        </span>
        <button type="button" onClick={onRemove} className="file-chip-remove" aria-label={`Remove ${fileName}`}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`dropzone ${dragging ? "is-dragging" : ""} ${reading ? "is-reading" : ""}`}
      >
        <span className="dropzone-icon" aria-hidden="true">
          {reading ? <span className="dropzone-spinner" /> : <UploadIcon />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {reading ? (
              "Reading your file..."
            ) : (
              <>
                {/* Phones can't drag files, so they see a different prompt. */}
                <span className="touch-hide">Drop your resume here</span>
                <span className="touch-only">Choose your resume file</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-sm text-mist">PDF, DOCX or TXT, up to 5 MB</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // the zone itself also opens the picker
            openPicker();
          }}
          disabled={reading}
          className="btn-upload"
        >
          Upload resume
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p role="alert" className="upload-error mt-3">
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V4m0 0-4 4m4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-accent">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}
