import { isElementNode, isEmpty, copyPasteChildNodes } from './node.js';

export const JOINABLE_BLOCK_TAGS = new Set([
	'P',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'PRE',
	'BLOCKQUOTE'
]);

export function isEmptyBlock(block: HTMLElement): boolean {
	const text = block.textContent ?? '';
	if (text.includes('\u00A0')) return false;

	if (block.querySelector('img, iframe, video, audio')) {
		return false;
	}

	if (isEmpty(block)) return true;
	return (
		block.childNodes.length === 1 &&
		isElementNode(block.firstChild!) &&
		block.firstChild!.tagName === 'BR'
	);
}

export function isJoinableBlock(tagName: string): boolean {
	return JOINABLE_BLOCK_TAGS.has(tagName.toUpperCase());
}

export function getPreviousBlockSibling(
	block: HTMLElement,
	isBlock: (tagName: string) => boolean
): HTMLElement | null {
	const prev = block.previousElementSibling;
	if (!prev || !isElementNode(prev)) return null;

	const tag = prev.tagName.toUpperCase();
	if (isBlock(tag) || tag === 'HR' || tag === 'IMG') {
		return prev as HTMLElement;
	}

	return null;
}

export function joinBlocks(target: HTMLElement, source: HTMLElement): Node {
	const joinPoint =
		target.lastChild && !isEmptyBlock(target)
			? target.lastChild
			: target;

	while (source.firstChild) {
		target.appendChild(source.firstChild);
	}

	source.remove();
	return joinPoint;
}

export function moveBlockChildren(target: HTMLElement, source: HTMLElement): void {
	copyPasteChildNodes(target, source);
	source.remove();
}
