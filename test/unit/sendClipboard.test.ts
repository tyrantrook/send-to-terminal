import { afterEach, describe, expect, it, vi } from 'vitest';
import { env, window, __resetConfig, __setConfig } from '../mocks/vscode';
import { sendClipboard } from '../../src/commands/sendClipboard';
import type { SendPipelineDeps } from '../../src/core/sendPipeline';
import type { TerminalDispatch } from '../../src/types';

function createDeps(): SendPipelineDeps & { sent: TerminalDispatch[] } {
  const sent: TerminalDispatch[] = [];
  return {
    sent,
    terminal: {
      bind: () => ({ name: 'zsh', isUsable: () => true }),
      send: (dispatch) => {
        sent.push(dispatch);
        return { terminalName: 'zsh', created: false };
      }
    },
    ui: {
      info: vi.fn(),
      confirm: vi.fn(async () => 'send' as const),
      review: vi.fn(async () => undefined)
    },
    log: { append: () => undefined }
  };
}

function withClipboard(text: string): void {
  vi.spyOn(env.clipboard, 'readText').mockResolvedValue(text);
}

afterEach(() => {
  __resetConfig();
  vi.restoreAllMocks();
  window.activeTextEditor = undefined;
});

describe('sendClipboard focus handling', () => {
  it('focuses the terminal when no editor is active, such as in a Markdown preview', async () => {
    withClipboard('echo hi');
    window.activeTextEditor = undefined;
    const deps = createDeps();

    await sendClipboard(deps);

    expect(deps.sent[0].focus).toBe(true);
  });

  it('leaves focus alone when an editor is active', async () => {
    withClipboard('echo hi');
    window.activeTextEditor = {} as never;
    const deps = createDeps();

    await sendClipboard(deps);

    expect(deps.sent[0].focus).toBe(false);
  });

  it('still honours focusTerminal when an editor is active', async () => {
    withClipboard('echo hi');
    __setConfig({ focusTerminal: true });
    window.activeTextEditor = {} as never;
    const deps = createDeps();

    await sendClipboard(deps);

    expect(deps.sent[0].focus).toBe(true);
  });
});
