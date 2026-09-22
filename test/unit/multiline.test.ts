import { describe, expect, it } from 'vitest';
import { applyMultilineMode, describeJoinHazard, splitLines } from '../../src/core/multiline';

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
      text: 'npm ci',
      notice: 'Send To Terminal: sent the first line only (1 skipped).'
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

describe('describeJoinHazard', () => {
  it('accepts plain commands', () => {
    expect(describeJoinHazard(['npm ci', 'npm test'])).toBeUndefined();
  });

  it('accepts a `#` inside a word', () => {
    expect(describeJoinHazard(['echo a#b', 'npm test'])).toBeUndefined();
  });

  it('accepts a `#` inside quotes', () => {
    expect(describeJoinHazard(["echo 'a # b'", 'npm test'])).toBeUndefined();
  });

  it('rejects a comment that would swallow later lines', () => {
    expect(describeJoinHazard(['# cleanup', 'rm -rf build'])).toMatch(/comment/);
  });

  it('rejects an unbalanced quote', () => {
    expect(describeJoinHazard(['echo "oops', 'npm test'])).toMatch(/quote/);
  });

  it('rejects a backslash continuation', () => {
    expect(describeJoinHazard(['rm -rf /tmp/foo \\', '--preserve-root'])).toMatch(/backslash/);
  });
});

describe('joinWithSemicolon hazards', () => {
  it('falls back to confirmation rather than swallowing a command in a comment', () => {
    const decision = applyMultilineMode("# don't do this\nls -la", 'joinWithSemicolon');

    expect(decision.kind).toBe('confirm');
    expect(decision).toMatchObject({ text: "# don't do this\nls -la" });
  });
});
