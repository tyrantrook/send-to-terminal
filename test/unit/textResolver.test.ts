import { describe, expect, it } from 'vitest';
import {
  dedent,
  normalizeNewlines,
  resolveText,
  sanitize,
  stripControlCharacters
} from '../../src/core/textResolver';
import {
  crlfSelection,
  emptySelection,
  indentedMultilineSelection,
  singleLineSelection,
  whitespaceOnlySelection
} from '../fixtures/selections';

const trimmed = { trimWhitespace: true, fallbackToCurrentLine: true };

describe('normalizeNewlines', () => {
  it('converts CRLF and lone CR to LF', () => {
    expect(normalizeNewlines('a\r\nb\rc')).toBe('a\nb\nc');
  });
});

describe('stripControlCharacters', () => {
  it('removes escape, EOF, and interrupt characters', () => {
    expect(stripControlCharacters('ec\u0003ho\u001b[A a\u0004b')).toBe('echo[A ab');
  });

  it('removes Unicode line separators the shell would not show', () => {
    expect(stripControlCharacters('echo a\u2028rm -rf /')).toBe('echo arm -rf /');
  });

  it('keeps tab and newline', () => {
    expect(stripControlCharacters('a\tb\nc')).toBe('a\tb\nc');
  });
});

describe('sanitize', () => {
  it('normalizes newlines and strips controls in one pass', () => {
    expect(sanitize('a\r\n\u0007b')).toBe('a\nb');
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
    expect(resolveText(singleLineSelection, trimmed)).toBe('npm run build');
  });

  it('falls back to the current line when the selection is empty', () => {
    expect(resolveText(emptySelection, trimmed)).toBe('npm run build');
  });

  it('returns an empty string when fallback is disabled', () => {
    expect(
      resolveText(emptySelection, { trimWhitespace: true, fallbackToCurrentLine: false })
    ).toBe('');
  });

  it('strips common indentation and trailing whitespace when trimming', () => {
    expect(resolveText(indentedMultilineSelection, trimmed)).toBe(
      'npm ci\n  npm run build\nnpm test'
    );
  });

  it('preserves the raw text when trimming is disabled', () => {
    expect(
      resolveText(indentedMultilineSelection, {
        trimWhitespace: false,
        fallbackToCurrentLine: true
      })
    ).toBe(indentedMultilineSelection.selectedText);
  });

  it('normalizes CRLF selections', () => {
    expect(resolveText(crlfSelection, trimmed)).toBe('echo one\necho two');
  });

  it('resolves whitespace-only input to an empty string', () => {
    expect(resolveText(whitespaceOnlySelection, trimmed)).toBe('');
  });

  it('strips control characters from the selection', () => {
    expect(
      resolveText({ selectedText: 'echo \u001bhi', currentLineText: '' }, trimmed)
    ).toBe('echo hi');
  });

  it('strips control characters from the current-line fallback', () => {
    expect(
      resolveText({ selectedText: '', currentLineText: 'echo \u0004bye' }, trimmed)
    ).toBe('echo bye');
  });
});
