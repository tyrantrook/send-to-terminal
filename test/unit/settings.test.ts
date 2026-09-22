import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getSettings, readSettings } from '../../src/vscode/settings';
import { __resetConfig, __setConfig } from '../mocks/vscode';

function config(values: Record<string, unknown>) {
  return {
    get<T>(key: string, defaultValue: T): T {
      return (key in values ? values[key] : defaultValue) as T;
    }
  };
}

afterEach(() => {
  __resetConfig();
});

describe('readSettings', () => {
  it('returns the documented defaults when nothing is configured', () => {
    expect(readSettings(config({}))).toEqual(DEFAULT_SETTINGS);
  });

  it('reads the nested clipboard auto-execute key', () => {
    expect(readSettings(config({ 'clipboard.autoExecute': true })).clipboardAutoExecute).toBe(
      true
    );
  });

  it('keeps confirmation on unless it is explicitly bypassed', () => {
    expect(readSettings(config({})).bypassConfirmation).toBe(false);
    expect(readSettings(config({ bypassConfirmation: true })).bypassConfirmation).toBe(true);
  });

  it('applies user overrides', () => {
    expect(
      readSettings(
        config({
          autoExecute: true,
          bypassConfirmation: true,
          revealTerminal: 'never',
          focusTerminal: true,
          multilineBehavior: 'joinWithSemicolon',
          trimWhitespace: false,
          fallbackToCurrentLine: false
        })
      )
    ).toEqual({
      autoExecute: true,
      clipboardAutoExecute: false,
      bypassConfirmation: true,
      revealTerminal: 'never',
      focusTerminal: true,
      multilineBehavior: 'joinWithSemicolon',
      trimWhitespace: false,
      fallbackToCurrentLine: false
    });
  });

  it('falls back to defaults for out-of-range enum values', () => {
    const settings = readSettings(
      config({ revealTerminal: 'sometimes', multilineBehavior: 'yolo' })
    );

    expect(settings.revealTerminal).toBe('always');
    expect(settings.multilineBehavior).toBe('confirm');
  });

  it('falls back to defaults for wrongly typed booleans', () => {
    expect(readSettings(config({ autoExecute: 'true' })).autoExecute).toBe(false);
    expect(readSettings(config({ focusTerminal: 1 })).focusTerminal).toBe(false);
  });
});

describe('getSettings', () => {
  it('reads from the sendToTerminal configuration section', () => {
    __setConfig({ multilineBehavior: 'firstLineOnly' });

    expect(getSettings().multilineBehavior).toBe('firstLineOnly');
  });
});
