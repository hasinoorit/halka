import type { Editor } from '../core/editor.js';
import { isElementNode } from './node.js';
import { isEmptyBlock } from './block.js';

export function findListItem(node: Node, root: HTMLElement): HTMLElement | null {
	let parent: Node | null = node;
	while (parent && parent !== root) {
		if (isElementNode(parent) && (parent as HTMLElement).tagName === 'LI') {
			return parent as HTMLElement;
		}
		parent = parent.parentElement;
	}
	return null;
}

export function getListParent(listItem: HTMLElement): HTMLElement | null {
	const parent = listItem.parentElement;
	if (!parent || (parent.tagName !== 'UL' && parent.tagName !== 'OL')) return null;
	return parent;
}

export function isNestedListItem(listItem: HTMLElement): boolean {
	const parentList = getListParent(listItem);
	if (!parentList) return false;
	const grandParent = parentList.parentElement;
	return !!grandParent && grandParent.tagName === 'LI';
}

export function listItemHasContent(listItem: HTMLElement): boolean {
	for (const child of listItem.childNodes) {
		if (isElementNode(child) && (child.tagName === 'UL' || child.tagName === 'OL')) {
			continue;
		}
		if (isElementNode(child) && child.tagName === 'BR') {
			if (listItem.childNodes.length === 1) continue;
		}
		if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === '') {
			continue;
		}
		if (isElementNode(child) && isEmptyBlock(child as HTMLElement)) {
			continue;
		}
		return true;
	}
	return false;
}

export function isEmptyListItem(listItem: HTMLElement): boolean {
	return !listItemHasContent(listItem);
}

export function joinListItems(target: HTMLElement, source: HTMLElement): void {
	const nestedLists: HTMLElement[] = [];

	for (const child of Array.from(source.childNodes)) {
		if (isElementNode(child) && (child.tagName === 'UL' || child.tagName === 'OL')) {
			nestedLists.push(child as HTMLElement);
		} else {
			target.appendChild(child);
		}
	}

	source.remove();

	for (const list of nestedLists) {
		target.appendChild(list);
	}
}

export function removeEmptyListItem(listItem: HTMLElement): void {
	const parentList = getListParent(listItem);
	listItem.remove();
	if (parentList && parentList.children.length === 0) {
		parentList.remove();
	}
}

export function outdentTopLevelListItem(editor: Editor, listItem: HTMLElement): HTMLElement {
	const parentList = getListParent(listItem)!;
	const paragraph = editor.createEl('p');

	if (listItem.getAttribute('style')) {
		paragraph.setAttribute('style', listItem.getAttribute('style') ?? '');
	}

	const nestedLists: HTMLElement[] = [];

	for (const child of Array.from(listItem.childNodes)) {
		if (isElementNode(child) && (child.tagName === 'UL' || child.tagName === 'OL')) {
			nestedLists.push(child as HTMLElement);
		} else {
			paragraph.appendChild(child);
		}
	}

	const nextSiblings: Element[] = [];
	let next = listItem.nextElementSibling;
	while (next) {
		nextSiblings.push(next);
		next = next.nextElementSibling;
	}

	if (nextSiblings.length > 0) {
		const newList = editor.createEl(parentList.tagName.toLowerCase() as 'ul' | 'ol');
		if (parentList.getAttribute('style')) {
			newList.setAttribute('style', parentList.getAttribute('style') ?? '');
		}
		for (const sibling of nextSiblings) {
			newList.appendChild(sibling);
		}
		parentList.after(newList);
	}

	parentList.before(paragraph);
	listItem.remove();

	for (const list of nestedLists) {
		paragraph.after(list);
	}

	if (parentList.children.length === 0) {
		parentList.remove();
	}

	if (paragraph.childNodes.length === 0) {
		paragraph.appendChild(editor.createEl('br'));
	}

	return paragraph;
}

export function unnestListItem(listItem: HTMLElement, parentList: HTMLElement): void {
	const grandParentListItem = parentList.parentElement;
	if (!grandParentListItem || grandParentListItem.tagName !== 'LI') return;

	grandParentListItem.after(listItem);

	if (parentList.children.length === 0) {
		parentList.remove();
	}
}
