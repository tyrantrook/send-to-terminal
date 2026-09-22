import { sanitize } from './textResolver';
import type { MultilineMode } from '../types';

export type MultilineDecision =
  | { kind: 'send'; text: string; notice?: string }
  | { kind: 'confirm'; text: string; lineCount: number; reason?: string }
  | { kind: 'noop' };

interface LineShape {
  /** A quote opened on this line and never closed. */
  unterminatedQuote: boolean;
  /** An unquoted `#` starts a comment that would swallow whatever follows it. */
  hasComment: boolean;
  /** A trailing backslash continues the command onto the next line. */
  continuation: boolean;
}

export function splitLines(text: string): string[] {
  return sanitize(text).split('\n');
}

/**
 * Walks a line tracking shell quote state. Joining with `;` is only safe when
 * none of these shapes are present, because `;` is not a newline.
 */
function analyzeLine(line: string): LineShape {
  let quote: "'" | '"' | null = null;
  let hasComment = false;
  let escapedEnd = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    escapedEnd = false;

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      }
      continue;
    }

    if (char === '\\') {
      i += 1;
      escapedEnd = i >= line.length;
      continue;
    }

    if (quote === '"') {
      if (char === '"') {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    // A `#` only opens a comment at the start of a word.
    if (char === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      hasComment = true;
    }
  }

  return { unterminatedQuote: quote !== null, hasComment, continuation: escapedEnd };
}

/** Why a `;`-join would change the command's meaning, or undefined when it is safe. */
export function describeJoinHazard(lines: string[]): string | undefined {
  for (const line of lines) {
    const shape = analyzeLine(line);

    if (shape.hasComment) {
      return 'A line contains a comment, which would swallow every line joined after it.';
    }
    if (shape.unterminatedQuote) {
      return 'A line has an unbalanced quote, which would leave the shell waiting for input.';
    }
    if (shape.continuation) {
      return 'A line ends with a backslash continuation, which `;` would break.';
    }
  }

  return undefined;
}

export function applyMultilineMode(text: string, mode: MultilineMode): MultilineDecision {
  const normalized = sanitize(text);
  const lines = normalized.split('\n');
  const meaningful = lines.filter((line) => line.trim().length > 0);

  if (meaningful.length === 0) {
    return { kind: 'noop' };
  }

  if (lines.length === 1) {
    return { kind: 'send', text: normalized };
  }

  switch (mode) {
    case 'sendAll':
      return { kind: 'send', text: normalized };
    case 'joinWithSemicolon': {
      const hazard = describeJoinHazard(meaningful);
      if (hazard) {
        return { kind: 'confirm', text: normalized, lineCount: meaningful.length, reason: hazard };
      }
      return {
        kind: 'send',
        text: meaningful.map((line) => line.trim().replace(/;+$/, '')).join('; ')
      };
    }
    case 'firstLineOnly': {
      const skipped = meaningful.length - 1;
      return {
        kind: 'send',
        text: meaningful[0].trim(),
        ...(skipped > 0
          ? { notice: `Send To Terminal: sent the first line only (${skipped} skipped).` }
          : {})
      };
    }
    case 'confirm':
      return { kind: 'confirm', text: normalized, lineCount: meaningful.length };
  }
}
