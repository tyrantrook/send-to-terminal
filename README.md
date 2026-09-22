# Send To Terminal

Send the editor selection, the current line, or the clipboard to VS Code's integrated terminal —
without anything running behind your back.

## Why

VS Code can already run a selection in the terminal. This extension exists for the case where the
text you are about to run came from somewhere you do not fully control: an AI chat panel, a README,
a pasted snippet, a log file.

By default **nothing is executed**. The text is typed into the terminal and you press Enter
yourself. Any send that *would* run a command asks first, and tells you what will run and where.

## Commands

| Command | Default keybinding | Notes |
| --------- | ------------------- | ------- |
| `Send To Terminal: Send Selection to Terminal` | `ctrl+alt+enter` / `cmd+alt+enter` | Also in the editor right-click menu. Falls back to the current line when nothing is selected. |
| `Send To Terminal: Send Clipboard to Terminal` | `ctrl+alt+shift+enter` / `cmd+alt+shift+enter` | Bound everywhere except the chat and inline-chat inputs, so it reaches a Markdown preview — and also the Explorer, Search, and Settings UI, where it previously did nothing. Also in the Markdown preview right-click menu. |
| `Send To Terminal: Send Selection to New Terminal` | — | Always creates a fresh terminal first. |

## Settings

| Setting | Default | Description |
| --------- | --------- | ------------- |
| `sendToTerminal.autoExecute` | `false` | Append a newline so editor-selection sends run immediately. |
| `sendToTerminal.clipboard.autoExecute` | `false` | Append a newline for clipboard sends. |
| `sendToTerminal.bypassConfirmation` | `false` | Send without confirmation, even when the payload will execute. |
| `sendToTerminal.revealTerminal` | `"always"` | When to show the terminal panel: `always`, `onCreate`, or `never`. |
| `sendToTerminal.focusTerminal` | `false` | Move keyboard focus to the terminal after sending. Only takes effect when the terminal is shown, so `revealTerminal: "never"` disables it. |
| `sendToTerminal.multilineBehavior` | `"confirm"` | How multi-line text is transformed before sending. |
| `sendToTerminal.trimWhitespace` | `true` | Trim whitespace and strip the indentation shared by every line. |
| `sendToTerminal.fallbackToCurrentLine` | `true` | Use the cursor's line when the selection is empty. |

## What gets sent

`multilineBehavior` controls how a multi-line selection becomes terminal input:

| Mode | Result |
| ------ | -------- |
| `confirm` | Sends every line as-is, after you approve it. |
| `sendAll` | Sends every line as-is. |
| `firstLineOnly` | Sends the first non-blank line and reports how many it skipped. |
| `joinWithSemicolon` | Joins the non-blank lines with `; ` into a single command. |

`joinWithSemicolon` refuses to join when doing so would change what the command means — an unquoted
`#` comment, an unbalanced quote, or a trailing backslash continuation — and asks you to confirm
sending the lines unjoined instead.

## Safety model

- **Nothing runs unless you say so.** Both auto-execute settings are off by default.
- **Multi-line sends always ask.** Each embedded newline is an Enter press, so a multi-line payload
  runs every line but the last no matter how auto-execute is configured.
- **The dialog is specific.** It names the target terminal, states how many of the lines will run
  immediately, and shows the text. When the text is too long for the dialog, **Review full text**
  opens the whole payload in an editor before you decide.
- **The terminal you approved is the terminal that receives the text.** If it closes while the
  dialog is open, the send is abandoned rather than redirected somewhere else.
- **Hidden characters are refused, not repaired.** Text containing control characters is rejected
  with the offending code point named, because silently deleting one can splice two tokens into a
  single runnable command. `U+0085`, `U+2028` and `U+2029` are treated as the line breaks they are,
  so they cannot smuggle a second command onto a line that looks like one.
- **Runaway sends are refused.** Anything above 2,000 lines or 100,000 characters is rejected.

The clipboard keybinding is scoped by exclusion rather than by an allowlist of focus contexts, so
it is live across the workbench — including text inputs such as the Settings UI search box. Only
the chat and inline-chat inputs are excluded. That is the trade for reaching a Markdown preview,
which is neither an editor nor a terminal; every send still passes through the checks above.

`sendToTerminal.bypassConfirmation` turns the dialog off for every send. Leave it off unless you
trust every source you send from, including AI chat output.

## Troubleshooting

The **Send To Terminal** output channel records every send: the source, the number of lines, how
many of them executed, and the terminal that received them.

## Sending from a Markdown preview

A Markdown preview is a webview, not a text editor, so there is no selection for the extension to
read — the text has to go through the clipboard:

1. Select the text in the preview and copy it (`ctrl+c` / `cmd+c`).
2. Run **Send Clipboard to Terminal** — keyboard shortcut, or right-click in the preview.

Nothing runs on its own. With `clipboard.autoExecute` off a single-line payload is typed into the
terminal without a dialog, so read it before pressing Enter — that is your check against a stale
clipboard if you skip step 1. A multi-line payload asks first and shows exactly what will run.

When no text editor is active — a Markdown preview, but equally the Explorer or the Settings UI —
the terminal takes focus even with `focusTerminal` off, because there is no editor to keep focus
in and the text would otherwise be stranded in a terminal you still have to click into. Setting
`revealTerminal` to `never` suppresses this, since focus only moves when the terminal is shown.

## Limitations

- In a Markdown preview only the clipboard command applies; `Send Selection` needs a real editor
  selection. The extension API exposes no way to read a selection out of another extension's
  webview, so the copy step cannot be automated away. The right-click entry is keyed to the
  built-in preview's webview ids, so it does not appear in third-party preview extensions.
- `joinWithSemicolon` assumes a POSIX-style shell such as bash, zsh, or fish. On `cmd.exe` the
  semicolon is not a command separator, so joined commands will not run as intended — use
  `sendAll` or `confirm` there.
- Text containing control characters cannot be sent at all, by design.

## Requirements

VS Code 1.90 or later. No runtime dependencies, and the extension makes no network requests.

## Feedback

Bug reports and feature requests are welcome at
[github.com/tyrantrook/send-to-terminal/issues](https://github.com/tyrantrook/send-to-terminal/issues).

## Development

```bash
npm install
npm run check-types      # tsc --noEmit
npm run compile          # esbuild bundle -> dist/extension.js
npm test                 # vitest unit tests
npm run test:integration # @vscode/test-cli in a real Extension Host
```

Press `F5` to launch the Extension Development Host with the esbuild watch task.

Pure logic lives in `src/core/` (text resolution, multi-line handling, the send pipeline) and is
unit-tested without a VS Code process. Everything touching the VS Code API is isolated in
`src/vscode/` behind thin adapters, and `src/commands/` wires the two together.

## License

MIT.
