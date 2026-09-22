import { applyMultilineMode } from './multiline';
import type { SendOutcome, SendRequest, SendSettings, TerminalDispatch } from '../types';

export interface TerminalSendResult {
  terminalName: string;
  created: boolean;
}

export interface TerminalPort {
  /** Name of the terminal that would receive the text, or undefined if a new one is needed. */
  peek(newTerminal: boolean): string | undefined;
  send(dispatch: TerminalDispatch): TerminalSendResult | Promise<TerminalSendResult>;
}

export interface UiPort {
  info(message: string): void | Promise<void>;
  confirm(message: string, detail: string): Promise<boolean>;
}

export interface LogPort {
  append(message: string): void;
}

export interface SendPipelineDeps {
  terminal: TerminalPort;
  ui: UiPort;
  log: LogPort;
}

const EMPTY_MESSAGE: Record<SendRequest['source'], string> = {
  selection: 'Send To Terminal: nothing to send.',
  clipboard: 'Send To Terminal: the clipboard is empty.'
};

export const MAX_LINES = 2000;
export const MAX_CHARACTERS = 100_000;
const PREVIEW_MAX_LINES = 10;
const PREVIEW_MAX_CHARACTERS = 500;

/** The payload the user is being asked to approve, truncated for the dialog. */
export function buildPreview(text: string): string {
  const lines = text.split('\n');
  let preview = lines.slice(0, PREVIEW_MAX_LINES).join('\n');
  let omitted = Math.max(0, lines.length - PREVIEW_MAX_LINES);

  if (preview.length > PREVIEW_MAX_CHARACTERS) {
    preview = preview.slice(0, PREVIEW_MAX_CHARACTERS);
    omitted = lines.length - preview.split('\n').length + 1;
  }

  return omitted > 0 ? `${preview}\n… (${omitted} more lines)` : preview;
}

export async function runSendPipeline(
  request: SendRequest,
  settings: SendSettings,
  deps: SendPipelineDeps
): Promise<SendOutcome> {
  const lineCount = request.text.split('\n').length;
  if (lineCount > MAX_LINES || request.text.length > MAX_CHARACTERS) {
    await deps.ui.info(
      `Send To Terminal: refusing to send ${lineCount} lines / ${request.text.length} characters ` +
        `(limit ${MAX_LINES} lines, ${MAX_CHARACTERS} characters).`
    );
    deps.log.append(`refused oversized ${request.source}: ${lineCount} lines`);
    return 'too-large';
  }

  const decision = applyMultilineMode(request.text, settings.multilineBehavior);

  if (decision.kind === 'noop') {
    await deps.ui.info(EMPTY_MESSAGE[request.source]);
    return 'empty';
  }

  // Clipboard text may be untrusted (e.g. copied from an AI chat panel), so it
  // uses its own — off by default — auto-execute setting.
  const execute =
    request.source === 'clipboard' ? settings.clipboardAutoExecute : settings.autoExecute;

  // An embedded newline IS an Enter press, so `execute: false` only holds back
  // the final line. Never let that happen without saying so.
  const payloadLines = decision.text.split('\n').length;
  const executedLines = execute ? payloadLines : payloadLines - 1;
  const misleadingExecute = !execute && payloadLines > 1;

  if (decision.kind === 'confirm' || misleadingExecute) {
    const target = deps.terminal.peek(request.newTerminal) ?? 'a new terminal';
    const reason = decision.kind === 'confirm' && decision.reason ? `${decision.reason}\n\n` : '';
    const confirmed = await deps.ui.confirm(
      `Send ${payloadLines} lines to ${target}?`,
      `${reason}${executedLines} of ${payloadLines} lines will run immediately.\n\n` +
        buildPreview(decision.text)
    );

    if (!confirmed) {
      deps.log.append(`cancelled ${request.source}: ${payloadLines} lines`);
      return 'cancelled';
    }
  }

  const result = await deps.terminal.send({
    text: decision.text,
    execute,
    newTerminal: request.newTerminal,
    reveal: settings.revealTerminal,
    focus: settings.focusTerminal
  });

  if (decision.kind === 'send' && decision.notice) {
    await deps.ui.info(decision.notice);
  }

  deps.log.append(
    `sent ${request.source}: ${payloadLines} lines, ${executedLines} executed, ` +
      `terminal "${result.terminalName}"${result.created ? ' (new)' : ''}`
  );

  return 'sent';
}
