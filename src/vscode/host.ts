import * as vscode from 'vscode';
import { peekActiveTerminalName, sendToTerminal } from './terminalResolver';
import type { SendPipelineDeps } from '../core/sendPipeline';

const CONFIRM_SEND = 'Send';

export function createHostDeps(channel: vscode.OutputChannel): SendPipelineDeps {
  return {
    terminal: { peek: peekActiveTerminalName, send: sendToTerminal },
    ui: {
      info: (message) => {
        void vscode.window.showInformationMessage(message);
      },
      confirm: async (message, detail) => {
        const choice = await vscode.window.showWarningMessage(
          message,
          { modal: true, detail },
          CONFIRM_SEND
        );
        return choice === CONFIRM_SEND;
      }
    },
    log: {
      append: (message) => {
        channel.appendLine(`[${new Date().toISOString()}] ${message}`);
      }
    }
  };
}
