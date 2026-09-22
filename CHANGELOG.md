# Changelog

## [0.2.0] - 2026-09-22

### Security

- Turning auto-execute off no longer implies a multi-line send is inert. Each embedded
  newline is an Enter press, so a multi-line payload always ran every line but the last;
  any send that would execute a line you did not ask to execute is now gated behind a
  confirmation dialog.
- The confirmation dialog now names the target terminal, states how many lines will run,
  and shows the text being sent, instead of only a line count.
- Control characters are stripped before text reaches the shell. Previously only carriage
  returns were normalised, so ESC, EOT and interrupt characters reached the line editor
  while being invisible in the prompt.
- `joinWithSemicolon` now refuses to join lines when a comment, unbalanced quote, or
  backslash continuation would change the command's meaning, and asks for confirmation
  instead.
- The clipboard keybinding is scoped to the editor and terminal rather than bound globally,
  so it no longer fires from the chat input or other unrelated surfaces.

### Added

- Sends above 2,000 lines or 100,000 characters are refused.
- `firstLineOnly` reports how many lines it skipped instead of discarding them silently.
- A "Send To Terminal" output channel recording source, line count, executed count, and
  target terminal for every send.

### Fixed

- Selections larger than ~124,000 lines threw `RangeError: Maximum call stack size exceeded`
  while computing shared indentation.
- A terminal whose shell had already exited was reused, silently swallowing the text; a new
  terminal is now created instead.
- A failing clipboard read surfaced as an unhandled command error.

## [0.1.0] - 2026-09-22

### Added

- `sendToTerminal.sendSelection`, `sendToTerminal.sendClipboard`, and
  `sendToTerminal.sendToNewTerminal` commands.
- Editor context-menu entry and keybindings for selection and clipboard sends.
- Settings for auto-execute (separate for clipboard), terminal reveal and focus,
  multi-line behaviour, whitespace trimming, and current-line fallback.
