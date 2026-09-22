import * as vscode from 'vscode';
import { sendToTerminal } from './terminalResolver';
import type { SendPipelineDeps } from '../core/sendPipeline';

const CONFIRM_SEND = 'Send';

export function createHostDeps(): SendPipelineDeps {
  return {
    terminal: { send: sendToTerminal },
    ui: {
      info: (message) => {
        void vscode.window.showInformationMessage(message);
      },
      confirm: async (message) => {
        const choice = await vscode.window.showWarningMessage(
          message,
          { modal: true },
          CONFIRM_SEND
        );
        return choice === CONFIRM_SEND;
      }
    }
  };
}
