import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_LINES, buildPreview, runSendPipeline } from '../../src/core/sendPipeline';
import type { SendPipelineDeps } from '../../src/core/sendPipeline';
import { DEFAULT_SETTINGS } from '../../src/vscode/settings';
import type { SendSettings, TerminalDispatch } from '../../src/types';

function createDeps(confirmResult = true): SendPipelineDeps & {
  sent: TerminalDispatch[];
  info: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
  logged: string[];
} {
  const sent: TerminalDispatch[] = [];
  const logged: string[] = [];
  const info = vi.fn();
  const confirm = vi.fn(async () => confirmResult);

  return {
    sent,
    info,
    confirm,
    logged,
    terminal: {
      peek: () => 'zsh',
      send: (dispatch) => {
        sent.push(dispatch);
        return { terminalName: 'zsh', created: false };
      }
    },
    ui: { info, confirm },
    log: {
      append: (message) => {
        logged.push(message);
      }
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

  describe('auto-execute off is not a silent lie', () => {
    const payload = 'echo one\nrm -rf /tmp/victim\necho three';

    it('never sends a multi-line clipboard payload without confirming first', async () => {
      await runSendPipeline(
        { text: payload, source: 'clipboard', newTerminal: false },
        settings,
        deps
      );

      expect(deps.confirm).toHaveBeenCalledOnce();
      expect(deps.sent).toHaveLength(1);
    });

    it('tells the user exactly how many lines will run', async () => {
      await runSendPipeline(
        { text: payload, source: 'clipboard', newTerminal: false },
        settings,
        deps
      );

      const [message, detail] = deps.confirm.mock.calls[0] as [string, string];
      expect(message).toBe('Send 3 lines to zsh?');
      expect(detail).toContain('2 of 3 lines will run immediately.');
    });

    it('shows the payload so the approval is informed', async () => {
      await runSendPipeline(
        { text: payload, source: 'clipboard', newTerminal: false },
        settings,
        deps
      );

      const [, detail] = deps.confirm.mock.calls[0] as [string, string];
      expect(detail).toContain('rm -rf /tmp/victim');
    });

    it('drops the whole payload when the user declines', async () => {
      const declining = createDeps(false);

      const outcome = await runSendPipeline(
        { text: payload, source: 'clipboard', newTerminal: false },
        settings,
        declining
      );

      expect(outcome).toBe('cancelled');
      expect(declining.sent).toHaveLength(0);
    });

    it('does not interrogate the user about a single-line send', async () => {
      await runSendPipeline(
        { text: 'echo one', source: 'clipboard', newTerminal: false },
        settings,
        deps
      );

      expect(deps.confirm).not.toHaveBeenCalled();
      expect(deps.sent[0].execute).toBe(false);
    });

    it('leaves sendAll with auto-execute on unprompted, as configured', async () => {
      await runSendPipeline(
        { text: payload, source: 'selection', newTerminal: false },
        settings,
        deps
      );

      expect(deps.confirm).not.toHaveBeenCalled();
      expect(deps.sent[0].execute).toBe(true);
    });
  });

  describe('size limits', () => {
    it('refuses a payload above the line limit', async () => {
      const huge = Array.from({ length: MAX_LINES + 1 }, (_, i) => `echo ${i}`).join('\n');

      const outcome = await runSendPipeline(
        { text: huge, source: 'selection', newTerminal: false },
        settings,
        deps
      );

      expect(outcome).toBe('too-large');
      expect(deps.sent).toHaveLength(0);
      expect(deps.info).toHaveBeenCalledOnce();
    });

    it('refuses a payload above the character limit', async () => {
      const outcome = await runSendPipeline(
        { text: 'x'.repeat(100_001), source: 'clipboard', newTerminal: false },
        settings,
        deps
      );

      expect(outcome).toBe('too-large');
      expect(deps.sent).toHaveLength(0);
    });
  });

  it('names the terminal that will receive the text', async () => {
    const newTerminalDeps = createDeps();
    newTerminalDeps.terminal.peek = () => undefined;

    await runSendPipeline(
      { text: 'a\nb', source: 'selection', newTerminal: true },
      { ...settings, multilineBehavior: 'confirm' },
      newTerminalDeps
    );

    const [message] = newTerminalDeps.confirm.mock.calls[0] as [string, string];
    expect(message).toBe('Send 2 lines to a new terminal?');
  });

  it('records every send in the log', async () => {
    await runSendPipeline(
      { text: 'npm test', source: 'selection', newTerminal: false },
      settings,
      deps
    );

    expect(deps.logged[0]).toBe('sent selection: 1 lines, 1 executed, terminal "zsh"');
  });
});

describe('buildPreview', () => {
  it('returns short payloads verbatim', () => {
    expect(buildPreview('a\nb')).toBe('a\nb');
  });

  it('truncates long payloads and reports the remainder', () => {
    const preview = buildPreview(Array.from({ length: 25 }, (_, i) => `line${i}`).join('\n'));

    expect(preview).toContain('line0');
    expect(preview).not.toContain('line20');
    expect(preview).toContain('… (15 more lines)');
  });
});
