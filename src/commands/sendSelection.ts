import * as vscode from 'vscode';
import { runSendPipeline } from '../core/sendPipeline';
import { resolveText } from '../core/textResolver';
import { captureEditorSnapshot } from '../vscode/editorAdapter';
import { getSettings } from '../vscode/settings';
import type { SendPipelineDeps } from '../core/sendPipeline';
import type { SendOutcome } from '../types';

export async function sendSelection(
  deps: SendPipelineDeps,
  options: { newTerminal?: boolean } = {}
): Promise<SendOutcome> {
  const snapshot = captureEditorSnapshot();
  if (!snapshot) {
    void vscode.window.showInformationMessage('Send To Terminal: no active editor.');
    return 'empty';
  }

  const settings = getSettings();
  const resolved = resolveText(snapshot, settings);

  if (!resolved.ok) {
    void vscode.window.showWarningMessage(`Send To Terminal: ${resolved.reason}`);
    return 'failed';
  }

  return runSendPipeline(
    { text: resolved.text, source: 'selection', newTerminal: options.newTerminal ?? false },
    settings,
    deps
  );
}
