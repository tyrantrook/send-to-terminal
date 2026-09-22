import { describe, expect, it } from 'vitest';
import { applyMultilineMode, splitLines } from '../../src/core/multiline';

const multiline = 'npm ci\nnpm run build;\n\nnpm test';

describe('splitLines', () => {
  it('splits on normalized newlines', () => {
    expect(splitLines('a\r\nb')).toEqual(['a', 'b']);
  });
});

describe('applyMultilineMode', () => {
  it('reports noop for blank text', () => {
    expect(applyMultilineMode('  \n\t', 'sendAll')).toEqual({ kind: 'noop' });
  });

  it('sends single-line text regardless of mode', () => {
    expect(applyMultilineMode('npm test', 'confirm')).toEqual({
      kind: 'send',
      text: 'npm test'
    });
  });

  it('sends every line in sendAll mode', () => {
    expect(applyMultilineMode(multiline, 'sendAll')).toEqual({
      kind: 'send',
      text: multiline
    });
  });

  it('joins non-blank lines and drops trailing semicolons', () => {
    expect(applyMultilineMode(multiline, 'joinWithSemicolon')).toEqual({
      kind: 'send',
      text: 'npm ci; npm run build; npm test'
    });
  });

  it('keeps only the first non-blank line', () => {
    expect(applyMultilineMode('\nnpm ci\nnpm test', 'firstLineOnly')).toEqual({
      kind: 'send',
      text: 'npm ci'
    });
  });

  it('asks for confirmation with the non-blank line count', () => {
    expect(applyMultilineMode(multiline, 'confirm')).toEqual({
      kind: 'confirm',
      text: multiline,
      lineCount: 3
    });
  });
});
