import * as vscode from 'vscode';
import { runSendPipeline } from '../core/sendPipeline';
import { resolveText } from '../core/textResolver';
import { createHostDeps } from '../vscode/host';
import { getSettings } from '../vscode/settings';
import type { SendOutcome } from '../types';

export async function sendClipboard(): Promise<SendOutcome> {
  const clipboardText = await vscode.env.clipboard.readText();
  const settings = getSettings();

  const text = resolveText(
    { selectedText: clipboardText, currentLineText: '' },
    { trimWhitespace: settings.trimWhitespace, fallbackToCurrentLine: false }
  );

  return runSendPipeline(
    { text, source: 'clipboard', newTerminal: false },
    settings,
    createHostDeps()
  );
}
