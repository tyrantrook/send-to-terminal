import * as vscode from 'vscode';
import type { TerminalSendResult } from '../core/sendPipeline';
import type { TerminalDispatch } from '../types';

export const TERMINAL_NAME = 'Send To Terminal';

export interface TerminalLike {
  name: string;
  exitStatus: { readonly code: number | undefined } | undefined;
  show(preserveFocus?: boolean): void;
  sendText(text: string, addNewLine?: boolean): void;
}

export interface TerminalWindowLike {
  activeTerminal: TerminalLike | undefined;
  createTerminal(name: string): TerminalLike;
}

export interface ResolvedTerminal {
  terminal: TerminalLike;
  created: boolean;
}

/** A terminal whose shell has exited stays in `window.terminals` and silently swallows input. */
function isUsable(terminal: TerminalLike | undefined): terminal is TerminalLike {
  return terminal !== undefined && terminal.exitStatus === undefined;
}

export function peekTerminalName(
  window: TerminalWindowLike,
  forceNew: boolean
): string | undefined {
  if (forceNew) {
    return undefined;
  }
  return isUsable(window.activeTerminal) ? window.activeTerminal.name : undefined;
}

export function resolveTerminal(window: TerminalWindowLike, forceNew: boolean): ResolvedTerminal {
  if (!forceNew && isUsable(window.activeTerminal)) {
    return { terminal: window.activeTerminal, created: false };
  }

  return { terminal: window.createTerminal(TERMINAL_NAME), created: true };
}

export function dispatchToTerminal(
  window: TerminalWindowLike,
  dispatch: TerminalDispatch
): TerminalSendResult {
  const { terminal, created } = resolveTerminal(window, dispatch.newTerminal);

  if (dispatch.reveal === 'always' || (dispatch.reveal === 'onCreate' && created)) {
    terminal.show(!dispatch.focus);
  }

  terminal.sendText(dispatch.text, dispatch.execute);
  return { terminalName: terminal.name, created };
}

export function sendToTerminal(dispatch: TerminalDispatch): TerminalSendResult {
  return dispatchToTerminal(vscode.window as unknown as TerminalWindowLike, dispatch);
}

export function peekActiveTerminalName(forceNew: boolean): string | undefined {
  return peekTerminalName(vscode.window as unknown as TerminalWindowLike, forceNew);
}
