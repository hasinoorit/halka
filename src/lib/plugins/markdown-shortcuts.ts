import { type Editor, definePlugin } from '../core/editor.js';

const SHORTCUTS: Record<string, string> = {
    '#': 'h1',
    '##': 'h2',
    '###': 'h3',
    '>': 'blockquote'
};

const LIST_SHORTCUTS: Record<string, 'list.toggleUnordered' | 'list.toggleOrdered'> = {
    '-': 'list.toggleUnordered',
    '*': 'list.toggleUnordered',
    '1.': 'list.toggleOrdered'
};

export const markdownShortcutsPlugin = definePlugin({
	name: 'markdown-shortcuts',
	events: {
		keydown: (editor: Editor, event: Event) => {
			const keyboardEvent = event as KeyboardEvent;
			if (keyboardEvent.key !== ' ') return;

			const range = editor.getRange();
			if (!range.collapsed) return;

			const block = editor.query.getCurrentBlock();
			if (!block) return;

			const text = block.textContent || '';
			const cursorOffset = range.startOffset;

			const beforeCursor = text.slice(0, cursorOffset).trim();

			if (SHORTCUTS[beforeCursor]) {
				const format = SHORTCUTS[beforeCursor];
				keyboardEvent.preventDefault();

				editor.runTransaction((ed) => {
					const textNode = block.firstChild;
					if (textNode && textNode.nodeType === Node.TEXT_NODE) {
						textNode.textContent = textNode.textContent!.slice(cursorOffset);
						if (textNode.textContent === '') {
							textNode.textContent = '\u00A0';
						}
					}
					ed.toggleBlockFormat(format);
				});
				return;
			}

			if (LIST_SHORTCUTS[beforeCursor]) {
				const command = LIST_SHORTCUTS[beforeCursor];
				keyboardEvent.preventDefault();

				editor.runTransaction((ed) => {
					const textNode = block.firstChild;
					if (textNode && textNode.nodeType === Node.TEXT_NODE) {
						textNode.textContent = textNode.textContent!.slice(cursorOffset);
					}
					ed.execCommand(command);
				});
				return;
			}
		}
	}
});
