import type { Editor } from './editor.js';
import { isElementNode, Node as NodeHelpers } from '../helpers/index.js';
import {
	findListItem,
	getListParent,
	isEmptyListItem
} from '../helpers/list.js';

function isInTableCell(node: Node, root: HTMLElement): boolean {
	let current: Node | null = node;
	while (current && current !== root) {
		if (isElementNode(current) && (current.tagName === 'TD' || current.tagName === 'TH')) {
			return true;
		}
		current = current.parentElement;
	}
	return false;
}

function ensureListItemPlaceholder(editor: Editor, listItem: HTMLElement): void {
	if (isEmptyListItem(listItem)) {
		listItem.appendChild(editor.createEl('br'));
	}
}

export function handleInsertParagraphInList(editor: Editor, event: InputEvent): boolean {
	if (editor.inline) return false;
	if (event.inputType !== 'insertParagraph' && event.inputType !== 'insertLineBreak') {
		return false;
	}

	const selection = editor.getSelection();
	if (!selection || selection.rangeCount === 0) return false;

	const range = selection.getRangeAt(0);
	if (!range.collapsed) return false;
	if (!editor.root.contains(range.commonAncestorContainer)) return false;

	if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) return false;
	if (isInTableCell(range.commonAncestorContainer, editor.root)) return false;

	const listItem = findListItem(range.commonAncestorContainer, editor.root);
	if (!listItem) return false;

	const list = getListParent(listItem);
	if (!list) return false;

	event.preventDefault();

	const newLi = editor.createEl('li');
	if (listItem.getAttribute('style')) {
		newLi.setAttribute('style', listItem.getAttribute('style') ?? '');
	}

	const extractRange = editor.window.document.createRange();
	extractRange.selectNodeContents(listItem);
	extractRange.setStart(range.startContainer, range.startOffset);

	if (!extractRange.collapsed) {
		const fragment = extractRange.extractContents();
		newLi.appendChild(fragment);
	}

	ensureListItemPlaceholder(editor, listItem);
	ensureListItemPlaceholder(editor, newLi);

	list.insertBefore(newLi, listItem.nextSibling);
	editor.selection.setCursorAtStart(newLi);
	editor.reportContentChangeIfNeeded();

	return true;
}
