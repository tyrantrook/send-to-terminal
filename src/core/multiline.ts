import { normalizeNewlines } from './textResolver';
import type { MultilineMode } from '../types';

export type MultilineDecision =
  | { kind: 'send'; text: string }
  | { kind: 'confirm'; text: string; lineCount: number }
  | { kind: 'noop' };

export function splitLines(text: string): string[] {
  return normalizeNewlines(text).split('\n');
}

export function applyMultilineMode(text: string, mode: MultilineMode): MultilineDecision {
  const normalized = normalizeNewlines(text);
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
    case 'joinWithSemicolon':
      return {
        kind: 'send',
        text: meaningful.map((line) => line.trim().replace(/;+$/, '')).join('; ')
      };
    case 'firstLineOnly':
      return { kind: 'send', text: meaningful[0].trim() };
    case 'confirm':
      return { kind: 'confirm', text: normalized, lineCount: meaningful.length };
  }
}
