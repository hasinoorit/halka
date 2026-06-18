import type { Editor } from './editor.js';
import { isElementNode, Node as NodeHelpers } from '../helpers/index.js';
import {
	getPreviousBlockSibling,
	isEmptyBlock,
	isJoinableBlock,
	joinBlocks
} from '../helpers/block.js';
import {
	findListItem,
	getListParent,
	isEmptyListItem,
	isNestedListItem,
	joinListItems,
	listItemHasContent,
	outdentTopLevelListItem,
	removeEmptyListItem,
	unnestListItem
} from '../helpers/list.js';

type BlockContext =
	| { kind: 'readonly' }
	| { kind: 'table' }
	| { kind: 'listItem'; li: HTMLElement; list: HTMLElement }
	| { kind: 'blockquote'; block: HTMLElement; quote: HTMLElement }
	| { kind: 'root'; block: HTMLElement };

function isSoleEmptyPlaceholder(root: HTMLElement): boolean {
	return (
		root.childNodes.length === 1 &&
		isElementNode(root.firstChild!) &&
		root.firstChild!.tagName === 'P' &&
		isEmptyBlock(root.firstChild as HTMLElement)
	);
}

function resolveContext(editor: Editor): BlockContext | null {
	const range = editor.getRange();
	const root = editor.root;

	if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
		return { kind: 'readonly' };
	}

	let cell: Node | null = range.commonAncestorContainer;
	while (cell && cell !== root) {
		if (isElementNode(cell) && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
			return { kind: 'table' };
		}
		cell = cell.parentElement;
	}

	const listItem = findListItem(range.commonAncestorContainer, root);
	if (listItem) {
		const list = getListParent(listItem);
		if (list) return { kind: 'listItem', li: listItem, list };
	}

	const block = editor.query.getCurrentBlock() as HTMLElement | null;
	if (!block || block === root) return null;

	let quote: Node | null = block.parentElement;
	while (quote && quote !== root) {
		if (isElementNode(quote) && quote.tagName === 'BLOCKQUOTE') {
			return { kind: 'blockquote', block, quote: quote as HTMLElement };
		}
		quote = quote.parentElement;
	}

	if (block.parentElement === root) {
		return { kind: 'root', block };
	}

	return null;
}

function getRootBlockForQuote(block: HTMLElement, quote: HTMLElement): HTMLElement | null {
	if (block.parentElement === quote) return block;

	let current: Node | null = block;
	while (current && current !== quote) {
		if (current.parentElement === quote && isElementNode(current)) {
			return current as HTMLElement;
		}
		current = current.parentElement;
	}

	return block.parentElement === quote ? block : null;
}

function handleVoidPrevious(editor: Editor, previous: HTMLElement, current: HTMLElement): boolean {
	const tag = previous.tagName.toUpperCase();

	if (tag === 'HR') {
		previous.remove();
		editor.selection.setCursorAtStart(current);
		return true;
	}

	if (tag === 'IMG') {
		editor.selection.setCursorBefore(previous);
		return true;
	}

	return false;
}

function handleRootBoundary(
	editor: Editor,
	block: HTMLElement,
	deleteCurrentIfEmpty = false
): boolean {
	const root = editor.root;
	const isBlock = (tag: string) => editor.schema.isBlock(tag);

	if (deleteCurrentIfEmpty && isEmptyBlock(block)) {
		if (isSoleEmptyPlaceholder(root)) return false;

		const previous = getPreviousBlockSibling(block, isBlock);
		block.remove();

		if (previous) {
			if (isJoinableBlock(previous.tagName)) {
				editor.selection.setCursorAtEnd(previous);
			} else {
				editor.selection.setCursorBefore(previous.nextSibling ?? previous);
			}
		} else {
			editor.ensureDocumentStructure({ emit: false });
		}
		return true;
	}

	const previous = getPreviousBlockSibling(block, isBlock);
	if (!previous) return false;

	if (handleVoidPrevious(editor, previous, block)) {
		return true;
	}

	if (isEmptyBlock(previous)) {
		previous.remove();
		editor.selection.setCursorAtStart(block);
		return true;
	}

	if (
		isJoinableBlock(previous.tagName) &&
		isJoinableBlock(block.tagName) &&
		previous.tagName === block.tagName
	) {
		const joinPoint = joinBlocks(previous, block);
		editor.selection.setCursorAtEnd(joinPoint);
		return true;
	}

	if (isJoinableBlock(previous.tagName)) {
		editor.selection.setCursorAtEnd(previous);
		return true;
	}

	return false;
}

function handleListBoundary(editor: Editor, listItem: HTMLElement, list: HTMLElement): boolean {
	if (isNestedListItem(listItem) && editor.selection.isAtBlockStart()) {
		const parentList = getListParent(listItem)!;
		unnestListItem(listItem, parentList);
		editor.selection.setCursorAtStart(listItem);
		return true;
	}

	const previousItem = listItem.previousElementSibling;

	if (isEmptyListItem(listItem)) {
		const cursorTarget =
			previousItem && previousItem.tagName === 'LI'
				? (previousItem as HTMLElement)
				: list.previousElementSibling;

		removeEmptyListItem(listItem);

		if (cursorTarget && isElementNode(cursorTarget)) {
			if (cursorTarget.tagName === 'LI') {
				editor.selection.setCursorAtEnd(cursorTarget as HTMLElement);
			} else if (editor.schema.isBlock(cursorTarget.tagName)) {
				editor.selection.setCursorAtEnd(cursorTarget as HTMLElement);
			}
		}
		return true;
	}

	if (!previousItem || previousItem.tagName !== 'LI') {
		if (listItemHasContent(listItem) && list.parentElement === editor.root) {
			const paragraph = outdentTopLevelListItem(editor, listItem);
			editor.selection.setCursorAtStart(paragraph);
			return true;
		}
		return false;
	}

	if (isEmptyListItem(previousItem as HTMLElement)) {
		removeEmptyListItem(previousItem as HTMLElement);
		editor.selection.setCursorAtStart(listItem);
		return true;
	}

	joinListItems(previousItem as HTMLElement, listItem);
	editor.selection.setCursorAtEnd(previousItem as HTMLElement);
	return true;
}

function handleBlockquoteBoundary(
	editor: Editor,
	block: HTMLElement,
	quote: HTMLElement
): boolean {
	const quoteBlock = getRootBlockForQuote(block, quote) ?? block;
	const previousInsideQuote = quoteBlock.previousElementSibling;

	if (
		previousInsideQuote &&
		isElementNode(previousInsideQuote) &&
		previousInsideQuote.tagName === 'P'
	) {
		return handleRootBoundary(editor, quoteBlock, isEmptyBlock(quoteBlock));
	}

	const previousRoot = quote.previousElementSibling;
	if (!previousRoot || !isElementNode(previousRoot)) {
		if (isEmptyBlock(quoteBlock)) {
			quoteBlock.remove();
			if (quote.children.length === 0) quote.remove();
			return true;
		}
		return false;
	}

	if (isEmptyBlock(previousRoot as HTMLElement)) {
		previousRoot.remove();
		editor.selection.setCursorAtStart(quoteBlock);
		return true;
	}

	if (handleVoidPrevious(editor, previousRoot as HTMLElement, quoteBlock)) {
		return true;
	}

	editor.selection.setCursorAtEnd(previousRoot as HTMLElement);
	return true;
}

function handleDelete(editor: Editor): boolean {
	const context = resolveContext(editor);
	if (!context) return false;

	switch (context.kind) {
		case 'readonly':
			return false;
		case 'table':
			return false;
		case 'listItem':
			return handleListBoundary(editor, context.li, context.list);
		case 'blockquote':
			return handleBlockquoteBoundary(editor, context.block, context.quote);
		case 'root': {
			if (isSoleEmptyPlaceholder(editor.root) && editor.selection.isAtBlockStart()) {
				return false;
			}

			const deleteCurrentIfEmpty = isEmptyBlock(context.block);
			return handleRootBoundary(editor, context.block, deleteCurrentIfEmpty);
		}
	}
}

export function handleDeleteContentBackward(editor: Editor, event: InputEvent): boolean {
	if (editor.inline) return false;
	if (event.inputType !== 'deleteContentBackward') return false;

	const selection = editor.getSelection();
	if (!selection || selection.rangeCount === 0) return false;

	const range = selection.getRangeAt(0);
	if (!range.collapsed) return false;
	if (!editor.root.contains(range.commonAncestorContainer)) return false;
	if (!editor.selection.isAtBlockStart()) return false;

	const context = resolveContext(editor);
	if (!context || context.kind === 'readonly' || context.kind === 'table') {
		return false;
	}

	event.preventDefault();

	editor.runTransaction(() => {
		handleDelete(editor);
	});

	return true;
}
