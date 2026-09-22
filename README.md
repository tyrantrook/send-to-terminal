# Send To Terminal

Send the current editor selection — or text copied out of an AI chat panel — to the active
integrated terminal, from the editor context menu or a keyboard shortcut.

## Commands

| Command | Default keybinding | Notes |
|---------|-------------------|-------|
| `Send To Terminal: Send Selection to Terminal` | `ctrl+alt+enter` / `cmd+alt+enter` | Also in the editor right-click menu. Falls back to the current line when nothing is selected. |
| `Send To Terminal: Send Clipboard to Terminal` | `ctrl+alt+shift+enter` / `cmd+alt+shift+enter` | Types the clipboard contents without running them by default. |
| `Send To Terminal: Send Selection to New Terminal` | — | Always creates a fresh terminal first. |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `sendToTerminal.autoExecute` | `true` | Append a newline so editor-selection sends run immediately. |
| `sendToTerminal.clipboard.autoExecute` | `false` | Append a newline for clipboard sends. |
| `sendToTerminal.revealTerminal` | `"always"` | `always` / `onCreate` / `never`. |
| `sendToTerminal.focusTerminal` | `false` | Move keyboard focus to the terminal after sending. |
| `sendToTerminal.multilineBehavior` | `"confirm"` | `sendAll` / `joinWithSemicolon` / `firstLineOnly` / `confirm`. |
| `sendToTerminal.trimWhitespace` | `true` | Trim whitespace and strip common leading indentation. |
| `sendToTerminal.fallbackToCurrentLine` | `true` | Use the cursor's line when the selection is empty. |

> **Security note**: anything sent with auto-execute enabled runs as a shell command. Clipboard
> sends may carry untrusted AI-generated text, so `sendToTerminal.clipboard.autoExecute` is off by
> default — the text is typed into the terminal and you press Enter yourself.

## Development

```bash
npm install
npm run check-types      # tsc --noEmit
npm run compile          # esbuild bundle -> dist/extension.js
npm test                 # vitest unit tests
npm run test:integration # @vscode/test-cli in a real Extension Host
```

Press `F5` to launch the Extension Development Host with the esbuild watch task.

## Architecture

Pure logic lives in `src/core/` (text resolution, multi-line handling, the send pipeline) and is
unit-tested without a VS Code process. Everything touching the VS Code API is isolated in
`src/vscode/` behind thin adapters, and `src/commands/` wires the two together.
