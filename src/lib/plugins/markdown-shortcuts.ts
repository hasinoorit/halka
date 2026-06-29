import { type Editor, definePlugin } from '../core/editor.js';
import { isHorizontalRule } from '../helpers/markdown.js';

const SHORTCUTS: Record<string, string> = {
	'#': 'h1',
	'##': 'h2',
	'###': 'h3',
	'####': 'h4',
	'#####': 'h5',
	'######': 'h6',
	'>': 'blockquote'
};

const LIST_SHORTCUTS: Record<string, 'list.toggleUnordered' | 'list.toggleOrdered'> = {
	'-': 'list.toggleUnordered',
	'*': 'list.toggleUnordered',
	'1.': 'list.toggleOrdered'
};

type InlineRule = {
	pattern: RegExp;
	tagName: string;
};

const INLINE_RULES: InlineRule[] = [
	{ pattern: /\*\*(.+?)\*\*$/, tagName: 'strong' },
	{ pattern: /__(.+?)__$/, tagName: 'strong' },
	{ pattern: /~~(.+?)~~$/, tagName: 's' },
	{ pattern: /`([^`]+?)`$/, tagName: 'code' },
	{ pattern: /\*([^*]+?)\*$/, tagName: 'em' },
	{ pattern: /_([^_]+?)_$/, tagName: 'em' }
];

function getTextBeforeCursor(block: Element, range: Range): string {
	const doc = block.ownerDocument;
	const preRange = doc.createRange();
	preRange.selectNodeContents(block);
	preRange.setEnd(range.startContainer, range.startOffset);
	return preRange.toString();
}

function findTextPositionInBlock(
	block: Element,
	offset: number
): { node: Text; offset: number } | null {
	const doc = block.ownerDocument;
	const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
	let current = 0;
	let lastNode: Text | null = null;

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		const len = node.data.length;

		if (offset <= current + len) {
			return { node, offset: offset - current };
		}

		current += len;
		lastNode = node;
	}

	if (lastNode && offset === current) {
		return { node: lastNode, offset: lastNode.length };
	}

	return null;
}

function createRangeAtOffsets(
	block: Element,
	startOffset: number,
	endOffset: number
): Range | null {
	const start = findTextPositionInBlock(block, startOffset);
	const end = findTextPositionInBlock(block, endOffset);

	if (!start || !end) return null;

	const range = block.ownerDocument.createRange();
	range.setStart(start.node, start.offset);
	range.setEnd(end.node, end.offset);
	return range;
}

function removeTextBeforeCursor(block: Element, range: Range, prefix: string): void {
	const rawBefore = getTextBeforeCursor(block, range);
	const trimmedEnd = rawBefore.trimEnd();
	const prefixIndex = trimmedEnd.lastIndexOf(prefix);

	if (prefixIndex === -1) return;

	const deleteRange = createRangeAtOffsets(block, prefixIndex, rawBefore.length);
	if (!deleteRange) return;

	deleteRange.deleteContents();

	if (!block.textContent) {
		block.appendChild(block.ownerDocument.createTextNode('\u00A0'));
	}
}

function applyInlineFormat(
	editor: Editor,
	block: Element,
	range: Range,
	matchText: string,
	innerText: string,
	tagName: string
): boolean {
	const endOffset = getTextBeforeCursor(block, range).length;
	const startOffset = endOffset - matchText.length;
	const matchRange = createRangeAtOffsets(block, startOffset, endOffset);

	if (!matchRange) return false;

	matchRange.deleteContents();

	const element = editor.createEl(tagName);
	element.textContent = innerText;
	matchRange.insertNode(element);
	editor.selection.setCursorAfter(element);

	return true;
}

function isInlineShortcutAllowed(block: Element): boolean {
	const tag = block.tagName;
	return tag !== 'PRE' && tag !== 'CODE';
}

function insertHorizontalRule(
	editor: Editor,
	block: Element,
	range: Range,
	marker: string
): void {
	removeTextBeforeCursor(block, range, marker);

	const parent = block.parentElement;
	if (!parent) return;

	const hr = editor.createEl('hr');
	const paragraph = editor.createEl('p');
	paragraph.appendChild(block.ownerDocument.createTextNode('\u00A0'));

	const blockIsEmpty = !block.textContent || block.textContent.trim() === '';

	if (blockIsEmpty) {
		parent.replaceChild(hr, block);
		parent.insertBefore(paragraph, hr.nextSibling);
	} else {
		parent.insertBefore(hr, block.nextSibling);
		parent.insertBefore(paragraph, hr.nextSibling);
	}

	editor.selection.setCursorAtStart(paragraph);
}

function handleMarkdownShortcut(editor: Editor, event: KeyboardEvent): void {
	const range = editor.getRange();
	if (!range.collapsed) return;

	const block = editor.query.getCurrentBlock();
	if (!block) return;

	const beforeCursor = getTextBeforeCursor(block, range).trim();

	if (isHorizontalRule(beforeCursor) && (event.key === ' ' || event.key === 'Enter')) {
		event.preventDefault();

		editor.runTransaction(() => {
			insertHorizontalRule(editor, block, range, beforeCursor);
		});
		return;
	}

	if (event.key !== ' ') return;

	if (SHORTCUTS[beforeCursor]) {
		const format = SHORTCUTS[beforeCursor];
		event.preventDefault();

		editor.runTransaction((ed) => {
			removeTextBeforeCursor(block, range, beforeCursor);
			ed.toggleBlockFormat(format);
		});
		return;
	}

	if (LIST_SHORTCUTS[beforeCursor]) {
		const command = LIST_SHORTCUTS[beforeCursor];
		event.preventDefault();

		editor.runTransaction((ed) => {
			removeTextBeforeCursor(block, range, beforeCursor);
			ed.execCommand(command);
		});
		return;
	}

	if (!isInlineShortcutAllowed(block)) return;

	const rawBefore = getTextBeforeCursor(block, range);

	for (const rule of INLINE_RULES) {
		const match = rawBefore.match(rule.pattern);
		if (!match) continue;

		event.preventDefault();

		editor.runTransaction(() => {
			applyInlineFormat(editor, block, range, match[0], match[1], rule.tagName);
		});
		return;
	}
}

export const markdownShortcutsPlugin = definePlugin({
	name: 'markdown-shortcuts',
	events: {
		keydown: (editor: Editor, event: Event) => {
			handleMarkdownShortcut(editor, event as KeyboardEvent);
		}
	}
});
