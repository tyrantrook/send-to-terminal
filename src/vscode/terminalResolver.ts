import * as vscode from 'vscode';
import type { BoundTerminal, TerminalSendResult } from '../core/sendPipeline';
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
  terminals: readonly TerminalLike[];
  createTerminal(name: string): TerminalLike;
}

export interface ResolvedTerminal {
  terminal: TerminalLike;
  created: boolean;
}

export interface BoundTerminalHandle extends BoundTerminal {
  terminal: TerminalLike;
}

/** A terminal whose shell has exited stays in `window.terminals` and silently swallows input. */
function isUsable(terminal: TerminalLike | undefined): terminal is TerminalLike {
  return terminal !== undefined && terminal.exitStatus === undefined;
}

/**
 * Claims the terminal a send would reuse. A brand-new terminal is never bound,
 * because one created after approval cannot have been swapped for another.
 */
export function bindTerminal(
  window: TerminalWindowLike,
  forceNew: boolean
): BoundTerminalHandle | undefined {
  const active = window.activeTerminal;
  if (forceNew || !isUsable(active)) {
    return undefined;
  }

  return {
    name: active.name,
    isUsable: () => isUsable(active) && window.terminals.includes(active),
    terminal: active
  };
}

export function resolveTerminal(window: TerminalWindowLike, forceNew: boolean): ResolvedTerminal {
  if (!forceNew && isUsable(window.activeTerminal)) {
    return { terminal: window.activeTerminal, created: false };
  }

  return { terminal: window.createTerminal(TERMINAL_NAME), created: true };
}

export function dispatchToTerminal(
  window: TerminalWindowLike,
  dispatch: TerminalDispatch,
  bound?: BoundTerminal
): TerminalSendResult {
  // Only this module creates bound handles.
  const handle = bound as BoundTerminalHandle | undefined;
  const { terminal, created } = handle
    ? { terminal: handle.terminal, created: false }
    : resolveTerminal(window, dispatch.newTerminal);

  if (dispatch.reveal === 'always' || (dispatch.reveal === 'onCreate' && created)) {
    terminal.show(!dispatch.focus);
  }

  terminal.sendText(dispatch.text, dispatch.execute);
  return { terminalName: terminal.name, created };
}

export function sendToTerminal(
  dispatch: TerminalDispatch,
  bound?: BoundTerminal
): TerminalSendResult {
  return dispatchToTerminal(vscode.window as unknown as TerminalWindowLike, dispatch, bound);
}

export function bindActiveTerminal(forceNew: boolean): BoundTerminal | undefined {
  return bindTerminal(vscode.window as unknown as TerminalWindowLike, forceNew);
}
