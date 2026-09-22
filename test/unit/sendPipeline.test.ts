import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_LINES, buildPreview, runSendPipeline } from '../../src/core/sendPipeline';
import type {
  BoundTerminal,
  ConfirmChoice,
  SendPipelineDeps
} from '../../src/core/sendPipeline';
import { DEFAULT_SETTINGS } from '../../src/vscode/settings';
import type { SendSettings, TerminalDispatch } from '../../src/types';

type TestDeps = SendPipelineDeps & {
  sent: TerminalDispatch[];
  targets: (BoundTerminal | undefined)[];
  info: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
  review: ReturnType<typeof vi.fn>;
  logged: string[];
  bound: BoundTerminal | undefined;
};

/** Answers the confirmation dialog with each choice in turn, then repeats the last. */
function createDeps(...choices: ConfirmChoice[]): TestDeps {
  const sent: TerminalDispatch[] = [];
  const targets: (BoundTerminal | undefined)[] = [];
  const logged: string[] = [];
  const answers: ConfirmChoice[] = choices.length > 0 ? [...choices] : ['send'];
  const info = vi.fn();
  const review = vi.fn(async (_text: string) => undefined);
  const confirm = vi.fn(async (_message: string, _detail: string, _canReview: boolean) =>
    answers.length > 1 ? answers.shift()! : answers[0]
  );

  const deps: TestDeps = {
    sent,
    targets,
    info,
    confirm,
    review,
    logged,
    bound: { name: 'zsh', isUsable: () => true },
    terminal: {
      bind: () => deps.bound,
      send: (dispatch, bound) => {
        sent.push(dispatch);
        targets.push(bound);
        return { terminalName: bound?.name ?? 'zsh', created: false };
      }
    },
    ui: { info, confirm, review },
    log: {
      append: (message) => {
        logged.push(message);
      }
    }
  };

  return deps;
}

const settings: SendSettings = { ...DEFAULT_SETTINGS, multilineBehavior: 'sendAll' };
const autoExecuting: SendSettings = { ...settings, autoExecute: true };

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

  it('types a single-line selection without running it, and without interrupting', async () => {
    const outcome = await runSendPipeline(
      { text: 'npm test', source: 'selection', newTerminal: false },
      settings,
      deps
    );

    expect(outcome).toBe('sent');
    expect(deps.confirm).not.toHaveBeenCalled();
    expect(deps.sent[0].execute).toBe(false);
  });

  it('auto-executes selection sends when autoExecute is on', async () => {
    const outcome = await runSendPipeline(
      { text: 'npm test', source: 'selection', newTerminal: false },
      autoExecuting,
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

  it('asks first, because auto-execute runs the command outright', async () => {
    await runSendPipeline(
      { text: 'rm -rf /tmp/victim', source: 'selection', newTerminal: false },
      autoExecuting,
      deps
    );

    expect(deps.confirm).toHaveBeenCalledOnce();
    const [message, detail] = deps.confirm.mock.calls[0];
    expect(message).toBe('Send 1 line to zsh?');
    expect(detail).toContain('1 of 1 line will run immediately.');
  });

  it('skips the dialog entirely when confirmation is bypassed', async () => {
    const outcome = await runSendPipeline(
      { text: 'echo one\necho two', source: 'selection', newTerminal: false },
      { ...autoExecuting, bypassConfirmation: true },
      deps
    );

    expect(outcome).toBe('sent');
    expect(deps.confirm).not.toHaveBeenCalled();
    expect(deps.sent[0].execute).toBe(true);
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
    const declining = createDeps('cancel');

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

      const [message, detail] = deps.confirm.mock.calls[0];
      expect(message).toBe('Send 3 lines to zsh?');
      expect(detail).toContain('2 of 3 lines will run immediately.');
    });

    it('shows the payload so the approval is informed', async () => {
      await runSendPipeline(
        { text: payload, source: 'clipboard', newTerminal: false },
        settings,
        deps
      );

      const [, detail] = deps.confirm.mock.calls[0];
      expect(detail).toContain('rm -rf /tmp/victim');
    });

    it('drops the whole payload when the user declines', async () => {
      const declining = createDeps('cancel');

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

    it('leaves an explicit bypass unprompted, as configured', async () => {
      await runSendPipeline(
        { text: payload, source: 'selection', newTerminal: false },
        { ...autoExecuting, bypassConfirmation: true },
        deps
      );

      expect(deps.confirm).not.toHaveBeenCalled();
      expect(deps.sent[0].execute).toBe(true);
    });
  });

  describe('the approved terminal is the one that receives the text', () => {
    it('delivers to the terminal named in the dialog', async () => {
      await runSendPipeline(
        { text: 'a\nb', source: 'selection', newTerminal: false },
        settings,
        deps
      );

      expect(deps.targets[0]).toBe(deps.bound);
    });

    it('aborts when the approved terminal closes while the dialog is open', async () => {
      deps.bound = { name: 'zsh', isUsable: () => false };

      const outcome = await runSendPipeline(
        { text: 'a\nb', source: 'selection', newTerminal: false },
        settings,
        deps
      );

      expect(outcome).toBe('failed');
      expect(deps.sent).toHaveLength(0);
      expect(deps.info).toHaveBeenCalledWith(expect.stringContaining('closed while waiting'));
    });

    it('binds nothing when no confirmation was needed', async () => {
      await runSendPipeline(
        { text: 'npm test', source: 'selection', newTerminal: false },
        settings,
        deps
      );

      expect(deps.targets[0]).toBeUndefined();
    });
  });

  describe('reviewing the full text', () => {
    const long = Array.from({ length: 30 }, (_, i) => `echo ${i}`).join('\n');

    it('offers review only when the dialog cannot show everything', async () => {
      await runSendPipeline(
        { text: 'a\nb', source: 'selection', newTerminal: false },
        settings,
        deps
      );

      expect(deps.confirm.mock.calls[0][2]).toBe(false);
    });

    it('offers review when the preview is truncated', async () => {
      await runSendPipeline(
        { text: long, source: 'selection', newTerminal: false },
        settings,
        deps
      );

      expect(deps.confirm.mock.calls[0][2]).toBe(true);
    });

    it('shows the untruncated payload and asks again', async () => {
      const reviewing = createDeps('review', 'send');

      const outcome = await runSendPipeline(
        { text: long, source: 'selection', newTerminal: false },
        settings,
        reviewing
      );

      expect(reviewing.review).toHaveBeenCalledWith(long);
      expect(reviewing.confirm).toHaveBeenCalledTimes(2);
      expect(outcome).toBe('sent');
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
    newTerminalDeps.bound = undefined;

    await runSendPipeline(
      { text: 'a\nb', source: 'selection', newTerminal: true },
      { ...settings, multilineBehavior: 'confirm' },
      newTerminalDeps
    );

    const [message] = newTerminalDeps.confirm.mock.calls[0];
    expect(message).toBe('Send 2 lines to a new terminal?');
  });

  it('records every send in the log', async () => {
    await runSendPipeline(
      { text: 'npm test', source: 'selection', newTerminal: false },
      autoExecuting,
      deps
    );

    expect(deps.logged[0]).toBe('sent selection: 1 lines, 1 executed, terminal "zsh"');
  });
});

describe('buildPreview', () => {
  it('returns short payloads verbatim', () => {
    expect(buildPreview('a\nb')).toEqual({ text: 'a\nb', truncated: false });
  });

  it('truncates long payloads and reports the remainder', () => {
    const preview = buildPreview(Array.from({ length: 25 }, (_, i) => `line${i}`).join('\n'));

    expect(preview.truncated).toBe(true);
    expect(preview.text).toContain('line0');
    expect(preview.text).not.toContain('line20');
    expect(preview.text).toContain('… (15 more lines)');
  });
});
