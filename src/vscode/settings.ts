import * as vscode from 'vscode';
import type { MultilineMode, RevealMode, SendSettings } from '../types';

export const SETTINGS_SECTION = 'sendToTerminal';

export interface ConfigurationLike {
  get<T>(section: string, defaultValue: T): T;
}

export const DEFAULT_SETTINGS: SendSettings = {
  autoExecute: false,
  clipboardAutoExecute: false,
  bypassConfirmation: false,
  revealTerminal: 'always',
  focusTerminal: false,
  multilineBehavior: 'confirm',
  trimWhitespace: true,
  fallbackToCurrentLine: true
};

const REVEAL_MODES: readonly RevealMode[] = ['always', 'onCreate', 'never'];
const MULTILINE_MODES: readonly MultilineMode[] = [
  'sendAll',
  'joinWithSemicolon',
  'firstLineOnly',
  'confirm'
];

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function readSettings(config: ConfigurationLike): SendSettings {
  return {
    autoExecute: asBoolean(
      config.get<unknown>('autoExecute', DEFAULT_SETTINGS.autoExecute),
      DEFAULT_SETTINGS.autoExecute
    ),
    clipboardAutoExecute: asBoolean(
      config.get<unknown>('clipboard.autoExecute', DEFAULT_SETTINGS.clipboardAutoExecute),
      DEFAULT_SETTINGS.clipboardAutoExecute
    ),
    bypassConfirmation: asBoolean(
      config.get<unknown>('bypassConfirmation', DEFAULT_SETTINGS.bypassConfirmation),
      DEFAULT_SETTINGS.bypassConfirmation
    ),
    revealTerminal: oneOf(
      config.get<unknown>('revealTerminal', DEFAULT_SETTINGS.revealTerminal),
      REVEAL_MODES,
      DEFAULT_SETTINGS.revealTerminal
    ),
    focusTerminal: asBoolean(
      config.get<unknown>('focusTerminal', DEFAULT_SETTINGS.focusTerminal),
      DEFAULT_SETTINGS.focusTerminal
    ),
    multilineBehavior: oneOf(
      config.get<unknown>('multilineBehavior', DEFAULT_SETTINGS.multilineBehavior),
      MULTILINE_MODES,
      DEFAULT_SETTINGS.multilineBehavior
    ),
    trimWhitespace: asBoolean(
      config.get<unknown>('trimWhitespace', DEFAULT_SETTINGS.trimWhitespace),
      DEFAULT_SETTINGS.trimWhitespace
    ),
    fallbackToCurrentLine: asBoolean(
      config.get<unknown>('fallbackToCurrentLine', DEFAULT_SETTINGS.fallbackToCurrentLine),
      DEFAULT_SETTINGS.fallbackToCurrentLine
    )
  };
}

export function getSettings(): SendSettings {
  return readSettings(vscode.workspace.getConfiguration(SETTINGS_SECTION));
}
