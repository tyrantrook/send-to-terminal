import { describe, expect, it } from 'vitest';
import { dedent, normalizeNewlines, resolveText } from '../../src/core/textResolver';
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

describe('dedent', () => {
  it('removes the indentation shared by all non-blank lines', () => {
    expect(dedent('    a\n      b\n\n    c')).toBe('a\n  b\n\nc');
  });

  it('returns an empty string when there are no non-blank lines', () => {
    expect(dedent('   \n\t')).toBe('');
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
});
