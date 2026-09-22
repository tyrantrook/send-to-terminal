import * as vscode from 'vscode';
import { sendClipboard } from './commands/sendClipboard';
import { sendSelection } from './commands/sendSelection';
import { createHostDeps } from './vscode/host';

export function activate(context: vscode.ExtensionContext): void {
  const channel = vscode.window.createOutputChannel('Send To Terminal');
  const deps = createHostDeps(channel);

  context.subscriptions.push(
    channel,
    vscode.commands.registerCommand('sendToTerminal.sendSelection', () => sendSelection(deps)),
    vscode.commands.registerCommand('sendToTerminal.sendToNewTerminal', () =>
      sendSelection(deps, { newTerminal: true })
    ),
    vscode.commands.registerCommand('sendToTerminal.sendClipboard', () => sendClipboard(deps))
  );
}

export function deactivate(): void {
  // Nothing to dispose beyond the command registrations tracked by context.subscriptions.
}
