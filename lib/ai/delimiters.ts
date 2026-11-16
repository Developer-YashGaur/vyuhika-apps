// Delimiters mark where each piece of user text starts and ends in a prompt, like
// <<<RESUME_START>>> ... <<<RESUME_END>>>. The AI is told to treat everything between them as data.
// Shared by every app.

// Any marker that looks like ours: <<<SOME_NAME_START>>> or <<<SOME_NAME_END>>>, in any case, with spaces.
const MARKER = /<<<\s*[A-Z_]+_(START|END)\s*>>>/gi;

// The start and end markers for one block, for example delimiters("RESUME").
export function delimiters(name: string): { start: string; end: string } {
  return { start: `<<<${name}_START>>>`, end: `<<<${name}_END>>>` };
}

// Removes our delimiter markers from user text, so pasted text can't close a block early
// and pretend to be outside the data. Repeats until none are left, so a marker hidden
// inside another one ("<<<RES<<<X_START>>>UME_START>>>") can't rebuild itself.
export function stripDelimiters(text: string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current.replace(MARKER, "");
  } while (current !== previous);
  return current;
}

// True if the text contains anything that looks like one of our markers.
export function containsDelimiter(text: string): boolean {
  return new RegExp(MARKER.source, "i").test(text);
}
