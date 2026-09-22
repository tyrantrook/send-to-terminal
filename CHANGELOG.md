# Changelog

## [0.2.0] - 2026-09-22

First public release.

### Commands

- Send the editor selection to the active terminal, falling back to the cursor's line when
  nothing is selected.
- Send the editor selection to a brand-new terminal.
- Send the clipboard to the active terminal.
- Editor context-menu entry, plus keybindings for the selection and clipboard commands. The
  clipboard binding is scoped to the editor and the terminal rather than bound globally, so
  it does not fire from the chat input or other unrelated surfaces.

### Safety

- Nothing is executed by default. `sendToTerminal.autoExecute` and
  `sendToTerminal.clipboard.autoExecute` are both off, so a send types the text into the
  terminal and you press Enter yourself.
- Every send that would run a command asks for confirmation first. That includes multi-line
  payloads regardless of the auto-execute settings, because each embedded newline is an
  Enter press and runs every line but the last. `sendToTerminal.bypassConfirmation`, off by
  default, is the only way to skip the dialog.
- The confirmation names the target terminal, states how many lines will run immediately,
  and shows the text. "Review full text" opens the whole payload in an editor when it is
  too long for the dialog.
- The terminal named in the confirmation is the terminal that receives the text. If it
  closes while the dialog is open, the send is abandoned rather than redirected.
- Control characters are refused rather than deleted, and `U+0085`, `U+2028` and `U+2029`
  are treated as line breaks. Deleting a hidden character can splice two tokens into a
  single runnable command that then looks like one line.
- `joinWithSemicolon` refuses to join lines when a comment, unbalanced quote, or backslash
  continuation would change the command's meaning, and asks for confirmation instead.
- Sends above 2,000 lines or 100,000 characters are refused.

### Settings

- Terminal reveal and focus behaviour, multi-line handling, whitespace trimming and shared
  indentation stripping, and current-line fallback.

### Other

- A "Send To Terminal" output channel records the source, line count, executed count, and
  target terminal for every send.
