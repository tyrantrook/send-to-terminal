import * as vscode from 'vscode';
import { bindActiveTerminal, sendToTerminal } from './terminalResolver';
import type { SendPipelineDeps } from '../core/sendPipeline';

const CONFIRM_SEND = 'Send';
const REVIEW_FULL_TEXT = 'Review full text';

export function createHostDeps(channel: vscode.OutputChannel): SendPipelineDeps {
  return {
    terminal: { bind: bindActiveTerminal, send: sendToTerminal },
    ui: {
      info: (message) => {
        void vscode.window.showInformationMessage(message);
      },
      confirm: async (message, detail, canReview) => {
        const actions = canReview ? [REVIEW_FULL_TEXT, CONFIRM_SEND] : [CONFIRM_SEND];
        const choice = await vscode.window.showWarningMessage(
          message,
          { modal: true, detail },
          ...actions
        );

        if (choice === CONFIRM_SEND) {
          return 'send';
        }
        return choice === REVIEW_FULL_TEXT ? 'review' : 'cancel';
      },
      review: async (text) => {
        const document = await vscode.workspace.openTextDocument({ content: text });
        await vscode.window.showTextDocument(document, { preview: true });
      }
    },
    log: {
      append: (message) => {
        channel.appendLine(`[${new Date().toISOString()}] ${message}`);
      }
    }
  };
}
