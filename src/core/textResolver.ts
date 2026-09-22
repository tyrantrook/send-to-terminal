export interface EditorSnapshot {
  selectedText: string;
  currentLineText: string;
}

export interface TextResolutionOptions {
  trimWhitespace: boolean;
  fallbackToCurrentLine: boolean;
}

export type TextResult = { ok: true; text: string } | { ok: false; reason: string };

/** Every sequence that means "new line" but would not survive to the shell as one. */
const LINE_SEPARATORS = /\r\n|[\r\u0085\u2028\u2029]/g;

/**
 * C0/C1 controls, excluding tab and newline. The pty hands these to the line
 * editor, where ESC starts a key binding and EOT closes the shell — none of it
 * visible in a confirmation prompt.
 */
const UNSAFE_CONTROLS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;

export function normalizeNewlines(text: string): string {
  return text.replace(LINE_SEPARATORS, '\n');
}

export function findUnsafeControl(text: string): string | undefined {
  return UNSAFE_CONTROLS.exec(text)?.[0];
}

/**
 * Removing a control character can splice two tokens into one runnable command,
 * so unsafe input is refused rather than repaired.
 */
export function sanitize(text: string): TextResult {
  const normalized = normalizeNewlines(text);
  const control = findUnsafeControl(normalized);

  if (control === undefined) {
    return { ok: true, text: normalized };
  }

  const codePoint = control.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
  return { ok: false, reason: `the text contains a control character (U+${codePoint}).` };
}

/** Removes the indentation shared by every non-blank line. */
export function dedent(text: string): string {
  const lines = text.split('\n');
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

export function resolveText(snapshot: EditorSnapshot, options: TextResolutionOptions): TextResult {
  const selection = sanitize(snapshot.selectedText);
  if (!selection.ok) {
    return selection;
  }

  let text: string;
  if (selection.text.trim().length > 0) {
    text = selection.text;
  } else if (options.fallbackToCurrentLine) {
    const currentLine = sanitize(snapshot.currentLineText);
    if (!currentLine.ok) {
      return currentLine;
    }
    text = currentLine.text;
  } else {
    text = '';
  }

  if (!options.trimWhitespace) {
    return { ok: true, text };
  }

  return {
    ok: true,
    text: dedent(text)
      .split('\n')
      .map((line) => line.replace(/\s+$/, ''))
      .join('\n')
      .trim()
  };
}
