import { Node as NodeHelpers, isElementNode } from '../helpers/index.js';
import {
	findListItem,
	getListParent,
	outdentTopLevelListItem,
	unnestListItem
} from '../helpers/list.js';
import { type Editor, definePlugin } from '../core/editor.js';

export type ListType = 'ul' | 'ol';

export type ListActiveState = {
	type: ListType;
};

const getListActiveState = (editor: Editor): ListActiveState | null => {
	const list = editor.query.matchPath(
		(node): node is HTMLElement =>
			node instanceof HTMLElement && (node.tagName === 'UL' || node.tagName === 'OL')
	);
	if (!(list instanceof HTMLElement)) {
		return null;
	}
	return { type: list.tagName.toLowerCase() as ListType };
};

declare module '../core/editor.js' {
	interface EditorStateMap {
		'list.active': ListActiveState | null;
	}
}

const toggleListForSelection = (editor: Editor, type: 'unordered' | 'ordered'): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();
		const root = editor.root;

		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		let node: Node | null = range.commonAncestorContainer;
		let listItem: HTMLElement | null = null;
		let list: HTMLElement | null = null;

		while (node && node !== root) {
			if (isElementNode(node) && (node as HTMLElement).tagName === 'LI' && !listItem) {
				listItem = node as HTMLElement;
			}
			if (
				isElementNode(node) &&
				((node as HTMLElement).tagName === 'UL' || (node as HTMLElement).tagName === 'OL') &&
				!list
			) {
				list = node as HTMLElement;
			}
			node = node.parentElement;
		}

		const targetTag = type === 'unordered' ? 'UL' : 'OL';

		if (list && listItem && list.tagName === targetTag) {
			editor.selection.preserveSelection(() => {
				const paragraph = editor.createEl('p');
				if (listItem.getAttribute('style')) {
					paragraph.setAttribute('style', listItem.getAttribute('style') ?? '');
				}
				NodeHelpers.copyPasteChildNodes(paragraph, listItem);

				list.parentElement?.insertBefore(paragraph, list.nextSibling);
				listItem.remove();

				if (!list.firstElementChild) {
					list.remove();
				}
			});
			return;
		}

		if (list && listItem && list.tagName !== targetTag) {
			editor.selection.preserveSelection(() => {
				const newList = editor.createEl(targetTag);
				NodeHelpers.copyPasteChildNodes(newList, list);
				list.replaceWith(newList);
			});
			return;
		}

		const rootList = root.firstElementChild;
		if (isElementNode(rootList) && (rootList as HTMLElement).tagName === targetTag) {
			const el = rootList as HTMLElement;
			editor.selection.preserveSelection(() => {
				const items = Array.from(el.children).filter(
					(child) => isElementNode(child) && (child as HTMLElement).tagName === 'LI'
				) as HTMLElement[];

				for (const item of items) {
					const paragraph = editor.createEl('p');
					if (item.getAttribute('style')) {
						paragraph.setAttribute('style', item.getAttribute('style') ?? '');
					}
					NodeHelpers.copyPasteChildNodes(paragraph, item);
					el.parentElement?.insertBefore(paragraph, el);
				}

				el.remove();
			});
			return;
		}

		let block = editor.query.getCurrentBlock() as HTMLElement | null;

		if (!block || block === root) {
			block = NodeHelpers.getClosestBlockElement(range.commonAncestorContainer, root);
		}

		if ((!block || block === root) && range.commonAncestorContainer === root) {
			const nodes = Array.from(root.childNodes);
			const index = Math.max(0, Math.min(range.startOffset, nodes.length));

			const resolveBlock = (node: Node | undefined): HTMLElement | null => {
				if (!node) return null;
				if (isElementNode(node)) {
					return node as HTMLElement;
				}
				return NodeHelpers.getClosestBlockElement(node, root) as HTMLElement | null;
			};

			// Prefer the node at the caret boundary first (start of current line),
			// then fall back to previous sibling when caret is after a block.
			block = resolveBlock(nodes[index]) ?? resolveBlock(nodes[index - 1]);
		}

		if (!block || block === root) return;

		editor.selection.preserveSelection(() => {
			const newList = editor.createEl(targetTag);
			const newItem = editor.createEl('li');

			if (block.getAttribute('style')) {
				newItem.setAttribute('style', block.getAttribute('style') ?? '');
			}

			NodeHelpers.copyPasteChildNodes(newItem, block);
			newList.appendChild(newItem);

			block.replaceWith(newList);
		});
	});
};

const indentList = (editor: Editor): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();
		const root = editor.root;
		const selection = editor.getSelection();
		const beforeRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
		const startContainer = beforeRange?.startContainer || null;
		const startOffset = beforeRange?.startOffset ?? 0;
		const wasCollapsed = beforeRange?.collapsed ?? false;

		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		let listItem = NodeHelpers.getClosestBlockElement(range.commonAncestorContainer, root);
		if (!listItem || listItem.tagName !== 'LI') {
			// Try to find LI if we are inside one but getClosestBlock returned something else?
			// Actually getClosestBlock might return the P inside LI if structure is different.
			// Standard structure: UL > LI > Text usually, OR UL > LI > P
			// Let's assume standard LI check.
			let parent = range.commonAncestorContainer;
			while (parent && parent !== root) {
				if (isElementNode(parent) && (parent as HTMLElement).tagName === 'LI') {
					listItem = parent as HTMLElement;
					break;
				}
				parent = parent.parentElement as Node;
			}
		}

		if (!listItem || listItem.tagName !== 'LI') return;

		const previousSibling = listItem.previousElementSibling;
		if (!previousSibling || previousSibling.tagName !== 'LI') return;

		// Move listItem into previousSibling
		const parentList = listItem.parentElement;
		if (!parentList) return;

		// Check if previousSibling already has a child list
		let nestedList = Array.from(previousSibling.children).find(
			(child) => child.tagName === 'UL' || child.tagName === 'OL'
		) as HTMLElement | undefined;

		if (!nestedList) {
			nestedList = editor.createEl(parentList.tagName as 'UL' | 'OL'); // Use same type as parent
			previousSibling.appendChild(nestedList);
		}
		nestedList.appendChild(listItem);

		// Restore caret precisely when original selection was collapsed
		if (wasCollapsed && startContainer) {
			const newRange = editor.window.document.createRange();
			try {
				newRange.setStart(startContainer, startOffset);
			} catch {
				// Fallback: select contents of moved listItem
				newRange.selectNodeContents(listItem);
				newRange.collapse(true);
			}
			editor.setSelection(newRange);
		}
	});
};

const outdentList = (editor: Editor): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();
		const root = editor.root;
		const selection = editor.getSelection();
		const beforeRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
		const startContainer = beforeRange?.startContainer || null;
		const startOffset = beforeRange?.startOffset ?? 0;
		const wasCollapsed = beforeRange?.collapsed ?? false;

		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		const listItem = findListItem(range.commonAncestorContainer, root);
		if (!listItem) return;

		const parentList = getListParent(listItem);
		if (!parentList) return;

		const grandParentListItem = parentList.parentElement;

		if (grandParentListItem && grandParentListItem.tagName === 'LI') {
			unnestListItem(listItem, parentList);

			if (wasCollapsed && startContainer) {
				const newRange = editor.window.document.createRange();
				try {
					newRange.setStart(startContainer, startOffset);
				} catch {
					newRange.selectNodeContents(listItem);
					newRange.collapse(true);
				}
				editor.setSelection(newRange);
			} else {
				editor.applySelection();
			}
			return;
		}

		const paragraph = outdentTopLevelListItem(editor, listItem);

		if (wasCollapsed && startContainer) {
			const newRange = editor.window.document.createRange();
			try {
				newRange.setStart(startContainer, startOffset);
			} catch {
				newRange.selectNodeContents(paragraph);
				newRange.collapse(true);
			}
			editor.setSelection(newRange);
		}
	});
};

export const listPlugin = definePlugin({
	name: 'list',
	commands: {
		'list.toggleUnordered': (editor: Editor) => {
			toggleListForSelection(editor, 'unordered');
		},
		'list.toggleOrdered': (editor: Editor) => {
			toggleListForSelection(editor, 'ordered');
		},
		'list.indent': (editor: Editor) => {
			indentList(editor);
		},
		'list.outdent': (editor: Editor) => {
			outdentList(editor);
		}
	},
	states: {
		'list.active': (editor: Editor) => getListActiveState(editor)
	},
	shortcuts: {
		'mod+shift+8': 'list.toggleUnordered',
		'mod+shift+7': 'list.toggleOrdered',
		tab: (editor: Editor, event: KeyboardEvent) => {
			event.preventDefault();
			editor.execCommand('list.indent');
		},
		'shift+tab': (editor: Editor, event: KeyboardEvent) => {
			event.preventDefault();
			editor.execCommand('list.outdent');
		}
	}
});
