import { describe, expect, it } from 'vitest';
import {
  TERMINAL_NAME,
  bindTerminal,
  dispatchToTerminal,
  resolveTerminal
} from '../../src/vscode/terminalResolver';
import type { TerminalLike, TerminalWindowLike } from '../../src/vscode/terminalResolver';
import type { TerminalDispatch } from '../../src/types';

function createTerminal(name: string, exitCode?: number): TerminalLike & {
  shown: boolean[];
  sentText: [string, boolean | undefined][];
} {
  const shown: boolean[] = [];
  const sentText: [string, boolean | undefined][] = [];

  return {
    name,
    exitStatus: exitCode === undefined ? undefined : { code: exitCode },
    shown,
    sentText,
    show: (preserveFocus) => {
      shown.push(preserveFocus ?? false);
    },
    sendText: (text, addNewLine) => {
      sentText.push([text, addNewLine]);
    }
  };
}

function createWindow(active: TerminalLike | undefined): TerminalWindowLike & {
  createdNames: string[];
  terminals: TerminalLike[];
} {
  const createdNames: string[] = [];
  const terminals: TerminalLike[] = active ? [active] : [];

  return {
    activeTerminal: active,
    terminals,
    createdNames,
    createTerminal: (name) => {
      const terminal = createTerminal(name);
      createdNames.push(name);
      terminals.push(terminal);
      return terminal;
    }
  };
}

const dispatch: TerminalDispatch = {
  text: 'npm test',
  execute: true,
  newTerminal: false,
  reveal: 'always',
  focus: false
};

describe('resolveTerminal', () => {
  it('reuses a live active terminal', () => {
    const active = createTerminal('zsh');

    expect(resolveTerminal(createWindow(active), false)).toEqual({
      terminal: active,
      created: false
    });
  });

  it('replaces a terminal whose shell has exited', () => {
    const window = createWindow(createTerminal('dead', 0));

    const resolved = resolveTerminal(window, false);

    expect(resolved.created).toBe(true);
    expect(window.createdNames).toEqual([TERMINAL_NAME]);
  });

  it('replaces a terminal that exited with a failure code', () => {
    const window = createWindow(createTerminal('dead', 127));

    expect(resolveTerminal(window, false).created).toBe(true);
  });

  it('creates a terminal when there is no active one', () => {
    expect(resolveTerminal(createWindow(undefined), false).created).toBe(true);
  });

  it('always creates when a new terminal is forced', () => {
    const window = createWindow(createTerminal('zsh'));

    expect(resolveTerminal(window, true).created).toBe(true);
  });
});

describe('bindTerminal', () => {
  it('binds a live active terminal by name', () => {
    expect(bindTerminal(createWindow(createTerminal('zsh')), false)?.name).toBe('zsh');
  });

  it('binds nothing for a dead terminal, because a new one will be created', () => {
    expect(bindTerminal(createWindow(createTerminal('dead', 0)), false)).toBeUndefined();
  });

  it('binds nothing when a new terminal is forced', () => {
    expect(bindTerminal(createWindow(createTerminal('zsh')), true)).toBeUndefined();
  });

  it('reports the binding as unusable once the shell exits', () => {
    const active = createTerminal('zsh');
    const bound = bindTerminal(createWindow(active), false)!;

    expect(bound.isUsable()).toBe(true);

    active.exitStatus = { code: 0 };

    expect(bound.isUsable()).toBe(false);
  });

  it('reports the binding as unusable once the terminal is disposed', () => {
    const active = createTerminal('zsh');
    const window = createWindow(active);
    const bound = bindTerminal(window, false)!;

    window.terminals.splice(0, 1);

    expect(bound.isUsable()).toBe(false);
  });
});

describe('dispatchToTerminal', () => {
  it('writes the text and reports the target', () => {
    const active = createTerminal('zsh');

    const result = dispatchToTerminal(createWindow(active), dispatch);

    expect(active.sentText).toEqual([['npm test', true]]);
    expect(result).toEqual({ terminalName: 'zsh', created: false });
  });

  it('passes execute=false straight through', () => {
    const active = createTerminal('zsh');

    dispatchToTerminal(createWindow(active), { ...dispatch, execute: false });

    expect(active.sentText).toEqual([['npm test', false]]);
  });

  it('preserves editor focus when focusTerminal is off', () => {
    const active = createTerminal('zsh');

    dispatchToTerminal(createWindow(active), dispatch);

    expect(active.shown).toEqual([true]);
  });

  it('takes focus when focusTerminal is on', () => {
    const active = createTerminal('zsh');

    dispatchToTerminal(createWindow(active), { ...dispatch, focus: true });

    expect(active.shown).toEqual([false]);
  });

  it('does not reveal an existing terminal in onCreate mode', () => {
    const active = createTerminal('zsh');

    dispatchToTerminal(createWindow(active), { ...dispatch, reveal: 'onCreate' });

    expect(active.shown).toEqual([]);
  });

  it('never reveals in never mode', () => {
    const active = createTerminal('zsh');

    dispatchToTerminal(createWindow(active), { ...dispatch, reveal: 'never' });

    expect(active.shown).toEqual([]);
  });

  it('delivers to the bound terminal even after another one becomes active', () => {
    const approved = createTerminal('approved');
    const window = createWindow(approved);
    const bound = bindTerminal(window, false)!;
    const other = createTerminal('other');
    window.activeTerminal = other;
    window.terminals.push(other);

    const result = dispatchToTerminal(window, dispatch, bound);

    expect(result).toEqual({ terminalName: 'approved', created: false });
    expect(approved.sentText).toEqual([['npm test', true]]);
    expect(other.sentText).toEqual([]);
  });
});
