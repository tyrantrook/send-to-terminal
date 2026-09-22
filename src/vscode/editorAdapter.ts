import * as vscode from 'vscode';
import type { EditorSnapshot } from '../core/textResolver';

export function captureEditorSnapshot(): EditorSnapshot | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  return {
    selectedText: editor.document.getText(editor.selection),
    currentLineText: editor.document.lineAt(editor.selection.active.line).text
  };
}
