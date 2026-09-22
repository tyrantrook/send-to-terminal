import * as vscode from 'vscode';
import type { TerminalDispatch } from '../types';

export const TERMINAL_NAME = 'Send To Terminal';

export interface ResolvedTerminal {
  terminal: vscode.Terminal;
  created: boolean;
}

export function resolveTerminal(forceNew: boolean): ResolvedTerminal {
  const active = vscode.window.activeTerminal;
  if (!forceNew && active) {
    return { terminal: active, created: false };
  }

  return { terminal: vscode.window.createTerminal(TERMINAL_NAME), created: true };
}

export function sendToTerminal(dispatch: TerminalDispatch): void {
  const { terminal, created } = resolveTerminal(dispatch.newTerminal);

  if (dispatch.reveal === 'always' || (dispatch.reveal === 'onCreate' && created)) {
    terminal.show(!dispatch.focus);
  }

  terminal.sendText(dispatch.text, dispatch.execute);
}
