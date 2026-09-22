import * as vscode from 'vscode';
import { runSendPipeline } from '../core/sendPipeline';
import { resolveText } from '../core/textResolver';
import { getSettings } from '../vscode/settings';
import type { SendPipelineDeps } from '../core/sendPipeline';
import type { SendOutcome } from '../types';

export async function sendClipboard(deps: SendPipelineDeps): Promise<SendOutcome> {
  let clipboardText: string;
  try {
    clipboardText = await vscode.env.clipboard.readText();
  } catch (error) {
    deps.log.append(`clipboard read failed: ${String(error)}`);
    void vscode.window.showWarningMessage('Send To Terminal: could not read the clipboard.');
    return 'failed';
  }

  const settings = getSettings();

  const resolved = resolveText(
    { selectedText: clipboardText, currentLineText: '' },
    { trimWhitespace: settings.trimWhitespace, fallbackToCurrentLine: false }
  );

  if (!resolved.ok) {
    void vscode.window.showWarningMessage(`Send To Terminal: ${resolved.reason}`);
    return 'failed';
  }

  return runSendPipeline(
    { text: resolved.text, source: 'clipboard', newTerminal: false },
    settings,
    deps
  );
}
