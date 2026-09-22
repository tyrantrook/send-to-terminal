import { describe, expect, it } from 'vitest';
import {
  dedent,
  findUnsafeControl,
  normalizeNewlines,
  resolveText,
  sanitize
} from '../../src/core/textResolver';
import type { EditorSnapshot, TextResolutionOptions } from '../../src/core/textResolver';
import {
  crlfSelection,
  emptySelection,
  indentedMultilineSelection,
  singleLineSelection,
  whitespaceOnlySelection
} from '../fixtures/selections';

const trimmed = { trimWhitespace: true, fallbackToCurrentLine: true };

/** resolveText refuses unsafe input, so the safe cases unwrap to plain text. */
function resolved(snapshot: EditorSnapshot, options: TextResolutionOptions): string {
  const result = resolveText(snapshot, options);
  if (!result.ok) {
    throw new Error(`expected resolvable text, got: ${result.reason}`);
  }
  return result.text;
}

describe('normalizeNewlines', () => {
  it('converts CRLF and lone CR to LF', () => {
    expect(normalizeNewlines('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('converts NEL and the Unicode line separators to LF', () => {
    expect(normalizeNewlines('a\u0085b\u2028c\u2029d')).toBe('a\nb\nc\nd');
  });
});

describe('findUnsafeControl', () => {
  it('finds escape, EOF, and interrupt characters', () => {
    expect(findUnsafeControl('ec\u0003ho')).toBe('\u0003');
    expect(findUnsafeControl('echo\u001b[A')).toBe('\u001b');
    expect(findUnsafeControl('echo\u0004')).toBe('\u0004');
  });

  it('allows tab and newline', () => {
    expect(findUnsafeControl('a\tb\nc')).toBeUndefined();
  });
});

describe('sanitize', () => {
  it('normalizes newlines when the text is safe', () => {
    expect(sanitize('a\r\nb')).toEqual({ ok: true, text: 'a\nb' });
  });

  it('refuses a control character instead of splicing the text back together', () => {
    const result = sanitize('echo a\u0007rm -rf /');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining('U+0007') });
  });

  it('treats a Unicode line separator as a line break, not a deletion', () => {
    expect(sanitize('echo safe;\u2028rm -rf /tmp/victim')).toEqual({
      ok: true,
      text: 'echo safe;\nrm -rf /tmp/victim'
    });
  });
});

describe('dedent', () => {
  it('removes the indentation shared by all non-blank lines', () => {
    expect(dedent('    a\n      b\n\n    c')).toBe('a\n  b\n\nc');
  });

  it('returns an empty string when there are no non-blank lines', () => {
    expect(dedent('   \n\t')).toBe('');
  });

  it('handles more lines than Math.min can take as arguments', () => {
    const lines = Array.from({ length: 200_000 }, (_, i) => `  line${i}`).join('\n');

    expect(dedent(lines).startsWith('line0\nline1')).toBe(true);
  });
});

describe('resolveText', () => {
  it('prefers the selection over the current line', () => {
    expect(resolved(singleLineSelection, trimmed)).toBe('npm run build');
  });

  it('falls back to the current line when the selection is empty', () => {
    expect(resolved(emptySelection, trimmed)).toBe('npm run build');
  });

  it('returns an empty string when fallback is disabled', () => {
    expect(resolved(emptySelection, { trimWhitespace: true, fallbackToCurrentLine: false })).toBe(
      ''
    );
  });

  it('strips common indentation and trailing whitespace when trimming', () => {
    expect(resolved(indentedMultilineSelection, trimmed)).toBe('npm ci\n  npm run build\nnpm test');
  });

  it('preserves the raw text when trimming is disabled', () => {
    expect(
      resolved(indentedMultilineSelection, {
        trimWhitespace: false,
        fallbackToCurrentLine: true
      })
    ).toBe(indentedMultilineSelection.selectedText);
  });

  it('normalizes CRLF selections', () => {
    expect(resolved(crlfSelection, trimmed)).toBe('echo one\necho two');
  });

  it('resolves whitespace-only input to an empty string', () => {
    expect(resolved(whitespaceOnlySelection, trimmed)).toBe('');
  });

  it('refuses a selection containing control characters', () => {
    expect(resolveText({ selectedText: 'echo \u001bhi', currentLineText: '' }, trimmed)).toEqual({
      ok: false,
      reason: expect.stringContaining('U+001B')
    });
  });

  it('refuses a current-line fallback containing control characters', () => {
    expect(resolveText({ selectedText: '', currentLineText: 'echo \u0004bye' }, trimmed)).toEqual({
      ok: false,
      reason: expect.stringContaining('U+0004')
    });
  });

  it('keeps a hidden separator as a real line break the caller must confirm', () => {
    expect(
      resolved({ selectedText: 'echo safe;\u2028rm -rf /tmp/victim', currentLineText: '' }, trimmed)
    ).toBe('echo safe;\nrm -rf /tmp/victim');
  });
});
