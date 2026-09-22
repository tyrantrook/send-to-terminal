import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // The `vscode` module only exists inside the Extension Host, so unit tests
    // resolve it to the in-repo stub.
    alias: {
      vscode: resolve(process.cwd(), 'test/mocks/vscode.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts']
  }
});
