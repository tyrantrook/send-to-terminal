export interface EditorSnapshot {
  selectedText: string;
  currentLineText: string;
}

export interface TextResolutionOptions {
  trimWhitespace: boolean;
  fallbackToCurrentLine: boolean;
}

/**
 * C0/C1 controls and Unicode line separators, excluding tab and newline. The pty
 * hands these to the line editor, where ESC starts a key binding and EOT closes
 * the shell — none of it visible in a confirmation prompt.
 */
const UNSAFE_CONTROLS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029]/g;

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

export function stripControlCharacters(text: string): string {
  return text.replace(UNSAFE_CONTROLS, '');
}

export function sanitize(text: string): string {
  return stripControlCharacters(normalizeNewlines(text));
}

/** Removes the indentation shared by every non-blank line. */
export function dedent(text: string): string {
  const lines = sanitize(text).split('\n');
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => /^[ \t]*/.exec(line)![0].length);

  if (indents.length === 0) {
    return '';
  }

  // Spreading into Math.min throws RangeError past ~124k arguments.
  const common = indents.reduce((min, indent) => (indent < min ? indent : min), Infinity);
  return lines.map((line) => line.slice(common)).join('\n');
}

export function resolveText(snapshot: EditorSnapshot, options: TextResolutionOptions): string {
  const selection = sanitize(snapshot.selectedText);

  let text: string;
  if (selection.trim().length > 0) {
    text = selection;
  } else if (options.fallbackToCurrentLine) {
    text = sanitize(snapshot.currentLineText);
  } else {
    text = '';
  }

  if (!options.trimWhitespace) {
    return text;
  }

  return dedent(text)
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .trim();
}
