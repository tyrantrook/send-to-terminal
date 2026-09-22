export interface EditorSnapshot {
  selectedText: string;
  currentLineText: string;
}

export interface TextResolutionOptions {
  trimWhitespace: boolean;
  fallbackToCurrentLine: boolean;
}

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/** Removes the indentation shared by every non-blank line. */
export function dedent(text: string): string {
  const lines = normalizeNewlines(text).split('\n');
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => /^[ \t]*/.exec(line)![0].length);

  if (indents.length === 0) {
    return '';
  }

  const common = Math.min(...indents);
  return lines.map((line) => line.slice(common)).join('\n');
}

export function resolveText(snapshot: EditorSnapshot, options: TextResolutionOptions): string {
  const selection = normalizeNewlines(snapshot.selectedText);

  let text: string;
  if (selection.trim().length > 0) {
    text = selection;
  } else if (options.fallbackToCurrentLine) {
    text = normalizeNewlines(snapshot.currentLineText);
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
