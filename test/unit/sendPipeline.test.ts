import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runSendPipeline } from '../../src/core/sendPipeline';
import type { SendPipelineDeps } from '../../src/core/sendPipeline';
import { DEFAULT_SETTINGS } from '../../src/vscode/settings';
import type { SendSettings, TerminalDispatch } from '../../src/types';

function createDeps(confirmResult = true): SendPipelineDeps & {
  sent: TerminalDispatch[];
  info: ReturnType<typeof vi.fn>;
} {
  const sent: TerminalDispatch[] = [];
  const info = vi.fn();

  return {
    sent,
    info,
    terminal: {
      send: (dispatch) => {
        sent.push(dispatch);
      }
    },
    ui: {
      info,
      confirm: async () => confirmResult
    }
  };
}

const settings: SendSettings = { ...DEFAULT_SETTINGS, multilineBehavior: 'sendAll' };

describe('runSendPipeline', () => {
  let deps: ReturnType<typeof createDeps>;

  beforeEach(() => {
    deps = createDeps();
  });

  it('reports empty and notifies when there is nothing to send', async () => {
    const outcome = await runSendPipeline(
      { text: '   \n ', source: 'clipboard', newTerminal: false },
      settings,
      deps
    );

    expect(outcome).toBe('empty');
    expect(deps.sent).toHaveLength(0);
    expect(deps.info).toHaveBeenCalledWith('Send To Terminal: the clipboard is empty.');
  });

  it('auto-executes selection sends when autoExecute is on', async () => {
    const outcome = await runSendPipeline(
      { text: 'npm test', source: 'selection', newTerminal: false },
      settings,
      deps
    );

    expect(outcome).toBe('sent');
    expect(deps.sent[0]).toEqual({
      text: 'npm test',
      execute: true,
      newTerminal: false,
      reveal: 'always',
      focus: false
    });
  });

  it('does not auto-execute clipboard sends by default', async () => {
    await runSendPipeline(
      { text: 'rm -rf /', source: 'clipboard', newTerminal: false },
      settings,
      deps
    );

    expect(deps.sent[0].execute).toBe(false);
  });

  it('honours the clipboard auto-execute opt-in', async () => {
    await runSendPipeline(
      { text: 'npm test', source: 'clipboard', newTerminal: false },
      { ...settings, clipboardAutoExecute: true },
      deps
    );

    expect(deps.sent[0].execute).toBe(true);
  });

  it('sends after the multi-line confirmation is accepted', async () => {
    const outcome = await runSendPipeline(
      { text: 'npm ci\nnpm test', source: 'selection', newTerminal: false },
      { ...settings, multilineBehavior: 'confirm' },
      deps
    );

    expect(outcome).toBe('sent');
    expect(deps.sent[0].text).toBe('npm ci\nnpm test');
  });

  it('cancels when the multi-line confirmation is declined', async () => {
    const declining = createDeps(false);

    const outcome = await runSendPipeline(
      { text: 'npm ci\nnpm test', source: 'selection', newTerminal: false },
      { ...settings, multilineBehavior: 'confirm' },
      declining
    );

    expect(outcome).toBe('cancelled');
    expect(declining.sent).toHaveLength(0);
  });

  it('forwards the new-terminal, reveal, and focus preferences', async () => {
    await runSendPipeline(
      { text: 'npm test', source: 'selection', newTerminal: true },
      { ...settings, revealTerminal: 'onCreate', focusTerminal: true },
      deps
    );

    expect(deps.sent[0]).toMatchObject({
      newTerminal: true,
      reveal: 'onCreate',
      focus: true
    });
  });
});
