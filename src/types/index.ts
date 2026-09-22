export type MultilineMode = 'sendAll' | 'joinWithSemicolon' | 'firstLineOnly' | 'confirm';

export type RevealMode = 'always' | 'onCreate' | 'never';

export type SendSource = 'selection' | 'clipboard';

/** Outcome of a send attempt, reported back to the caller for tests and logging. */
export type SendOutcome = 'sent' | 'cancelled' | 'empty' | 'too-large' | 'failed';

export interface SendSettings {
  autoExecute: boolean;
  clipboardAutoExecute: boolean;
  bypassConfirmation: boolean;
  revealTerminal: RevealMode;
  focusTerminal: boolean;
  multilineBehavior: MultilineMode;
  trimWhitespace: boolean;
  fallbackToCurrentLine: boolean;
}

export interface SendRequest {
  text: string;
  source: SendSource;
  newTerminal: boolean;
}

export interface TerminalDispatch {
  text: string;
  execute: boolean;
  newTerminal: boolean;
  reveal: RevealMode;
  focus: boolean;
}
