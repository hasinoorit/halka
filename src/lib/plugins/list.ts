import { Node as NodeHelpers, isElementNode } from '../helpers/index.js';
import { type Editor, definePlugin } from '../core/editor.js';

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
			const index = Math.max(0, range.startOffset - 1);
			const candidate = root.childNodes[index] as Node | undefined;

			if (isElementNode(candidate)) {
				block = candidate as HTMLElement;
			} else if (candidate) {
				block = NodeHelpers.getClosestBlockElement(candidate, root) as HTMLElement | null;
			}
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

		let listItem: HTMLElement | null = null;
		let parent = range.commonAncestorContainer;
		while (parent && parent !== root) {
			if (isElementNode(parent) && (parent as HTMLElement).tagName === 'LI') {
				listItem = parent as HTMLElement;
				break;
			}
			parent = parent.parentElement as Node;
		}

		if (!listItem) return;

		const parentList = listItem.parentElement;
		if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) return;

		const grandParentListItem = parentList.parentElement;


		// If grandparent is LI, we are nested -> Un-nest one level
		if (grandParentListItem && grandParentListItem.tagName === 'LI') {
			const greatGrandParentList = grandParentListItem.parentElement;
			if (greatGrandParentList) {
				// Move listItem to after grandParentListItem
				grandParentListItem.after(listItem);

				// If parentList is now empty, remove it
				if (parentList.children.length === 0) {
					parentList.remove();
				}
				// Restore caret precisely when original selection was collapsed
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
		}

		// Top level outdent
		const paragraph = editor.createEl('p');
		if (listItem.getAttribute('style')) {
			paragraph.setAttribute('style', listItem.getAttribute('style') ?? '');
		}

		const children = Array.from(listItem.childNodes);
		const nestedLists: HTMLElement[] = [];
		
		children.forEach(child => {
			const el = child as HTMLElement;
			if (isElementNode(child) && (el.tagName === 'UL' || el.tagName === 'OL')) {
				nestedLists.push(el);
			} else {
				paragraph.appendChild(child);
			}
		});

		// Split the list
		const nextSiblings: Element[] = [];
		let next = listItem.nextElementSibling;
		while (next) {
			nextSiblings.push(next);
			next = next.nextElementSibling;
		}

		if (nextSiblings.length > 0) {
			const newList = editor.createEl(parentList.tagName as 'UL' | 'OL');
			if (parentList.getAttribute('style')) {
				newList.setAttribute('style', parentList.getAttribute('style') ?? '');
			}
			nextSiblings.forEach((sib) => newList.appendChild(sib));
			parentList.after(newList);
		}

		parentList.after(paragraph);
		listItem.remove();

		if (nestedLists.length > 0) {
			nestedLists.forEach(list => {
				paragraph.after(list);
			});
		}

		if (parentList.children.length === 0) {
			parentList.remove();
		}

		// Restore caret precisely when original selection was collapsed
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
