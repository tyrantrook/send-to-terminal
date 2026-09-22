import * as vscode from 'vscode';
import { sendClipboard } from './commands/sendClipboard';
import { sendSelection } from './commands/sendSelection';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('sendToTerminal.sendSelection', () => sendSelection()),
    vscode.commands.registerCommand('sendToTerminal.sendToNewTerminal', () =>
      sendSelection({ newTerminal: true })
    ),
    vscode.commands.registerCommand('sendToTerminal.sendClipboard', () => sendClipboard())
  );
}

export function deactivate(): void {
  // Nothing to dispose beyond the command registrations tracked by context.subscriptions.
}
