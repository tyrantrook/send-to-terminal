/**
 * Stand-in for the `vscode` module, aliased in `vitest.config.ts`.
 * Only the surface the extension actually touches is implemented.
 */

const configValues = new Map<string, unknown>();

export function __setConfig(values: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(values)) {
    configValues.set(key, value);
  }
}

export function __resetConfig(): void {
  configValues.clear();
}

export const workspace = {
  getConfiguration(_section?: string) {
    return {
      get<T>(key: string, defaultValue: T): T {
        return configValues.has(key) ? (configValues.get(key) as T) : defaultValue;
      }
    };
  }
};

export const window = {
  activeTextEditor: undefined,
  activeTerminal: undefined,
  createTerminal: () => {
    throw new Error('createTerminal is not available in unit tests');
  },
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined
};

export const env = {
  clipboard: {
    readText: async () => '',
    writeText: async () => undefined
  }
};

export const commands = {
  registerCommand: () => ({ dispose: () => undefined }),
  executeCommand: async () => undefined
};
