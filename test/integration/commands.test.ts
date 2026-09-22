import * as assert from 'node:assert';
import * as vscode from 'vscode';

const COMMANDS = [
  'sendToTerminal.sendSelection',
  'sendToTerminal.sendClipboard',
  'sendToTerminal.sendToNewTerminal'
];

suite('Send To Terminal commands', () => {
  // activationEvents is empty, so commands only register once the extension is activated.
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension('local.send-to-terminal');
    assert.ok(extension, 'local.send-to-terminal extension was not found');
    await extension.activate();
  });

  suiteTeardown(() => {
    for (const terminal of vscode.window.terminals) {
      terminal.dispose();
    }
  });

  test('registers every contributed command', async () => {
    const registered = await vscode.commands.getCommands(true);
    for (const command of COMMANDS) {
      assert.ok(registered.includes(command), `${command} is not registered`);
    }
  });

  test('contributes the documented setting defaults', () => {
    const config = vscode.workspace.getConfiguration('sendToTerminal');

    assert.strictEqual(config.get('autoExecute'), true);
    assert.strictEqual(config.get('clipboard.autoExecute'), false);
    assert.strictEqual(config.get('revealTerminal'), 'always');
    assert.strictEqual(config.get('multilineBehavior'), 'confirm');
  });

  test('sends a single-line selection to a terminal', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'echo hello',
      language: 'shellscript'
    });
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(0, 0, 0, 10);

    const before = vscode.window.terminals.length;
    await vscode.commands.executeCommand('sendToTerminal.sendToNewTerminal');

    assert.strictEqual(vscode.window.terminals.length, before + 1);
  });

  test('does nothing when the clipboard is empty', async () => {
    await vscode.env.clipboard.writeText('');
    const before = vscode.window.terminals.length;

    await vscode.commands.executeCommand('sendToTerminal.sendClipboard');

    assert.strictEqual(
      vscode.window.terminals.length,
      before,
      'an empty clipboard must not create a terminal'
    );
  });

  test('contributes a scoped keybinding for the clipboard command', () => {
    const extension = vscode.extensions.getExtension('local.send-to-terminal');
    const keybindings = extension!.packageJSON.contributes.keybindings as {
      command: string;
      when?: string;
    }[];
    const clipboard = keybindings.find((k) => k.command === 'sendToTerminal.sendClipboard');

    assert.ok(clipboard?.when, 'the clipboard keybinding must not be globally bound');
  });
});
