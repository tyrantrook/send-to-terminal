import type { EditorSnapshot } from '../../src/core/textResolver';

export const emptySelection: EditorSnapshot = {
  selectedText: '',
  currentLineText: '    npm run build'
};

export const singleLineSelection: EditorSnapshot = {
  selectedText: 'npm run build',
  currentLineText: 'npm run build'
};

export const indentedMultilineSelection: EditorSnapshot = {
  selectedText: '    npm ci   \n      npm run build\n    npm test',
  currentLineText: '    npm ci'
};

export const crlfSelection: EditorSnapshot = {
  selectedText: 'echo one\r\necho two',
  currentLineText: 'echo one'
};

export const whitespaceOnlySelection: EditorSnapshot = {
  selectedText: '   \n\t\n',
  currentLineText: '   '
};
