import { applyMultilineMode } from './multiline';
import type { SendOutcome, SendRequest, SendSettings, TerminalDispatch } from '../types';

export interface TerminalPort {
  send(dispatch: TerminalDispatch): void | Promise<void>;
}

export interface UiPort {
  info(message: string): void | Promise<void>;
  confirm(message: string): Promise<boolean>;
}

export interface SendPipelineDeps {
  terminal: TerminalPort;
  ui: UiPort;
}

const EMPTY_MESSAGE: Record<SendRequest['source'], string> = {
  selection: 'Send To Terminal: nothing to send.',
  clipboard: 'Send To Terminal: the clipboard is empty.'
};

export async function runSendPipeline(
  request: SendRequest,
  settings: SendSettings,
  deps: SendPipelineDeps
): Promise<SendOutcome> {
  const decision = applyMultilineMode(request.text, settings.multilineBehavior);

  if (decision.kind === 'noop') {
    await deps.ui.info(EMPTY_MESSAGE[request.source]);
    return 'empty';
  }

  if (decision.kind === 'confirm') {
    const confirmed = await deps.ui.confirm(
      `Send ${decision.lineCount} lines to the terminal?`
    );
    if (!confirmed) {
      return 'cancelled';
    }
  }

  // Clipboard text may be untrusted (e.g. copied from an AI chat panel), so it
  // uses its own — off by default — auto-execute setting.
  const execute =
    request.source === 'clipboard' ? settings.clipboardAutoExecute : settings.autoExecute;

  await deps.terminal.send({
    text: decision.text,
    execute,
    newTerminal: request.newTerminal,
    reveal: settings.revealTerminal,
    focus: settings.focusTerminal
  });

  return 'sent';
}
