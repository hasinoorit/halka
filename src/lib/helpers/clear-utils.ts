import { defaultSchema } from '../core/schema.js';
import { getParentElements, isElementNode, isInsideReadonly, isTextNode } from './node.js';

export function defaultIsBlock(tagName: string): boolean {
	return defaultSchema.blocks.has(tagName.toUpperCase());
}

export function getBlockAtRange(
	root: HTMLElement,
	range: Range,
	isBlock: (tagName: string) => boolean
): HTMLElement | null {
	const ancestors = getParentElements(range.commonAncestorContainer);

	for (const ancestor of ancestors) {
		if (isElementNode(ancestor) && isBlock(ancestor.tagName) && ancestor !== root) {
			return ancestor as HTMLElement;
		}
	}

	return null;
}

export function shouldSkipElement(element: HTMLElement): boolean {
	return (
		element.getAttribute('data-protected') === 'true' ||
		element.getAttribute('contenteditable') === 'false' ||
		element.hasAttribute('data-readonly') ||
		isInsideReadonly(element)
	);
}

export function splitRangeTextBoundaries(range: Range): void {
	if (isTextNode(range.startContainer) && range.startOffset > 0) {
		const remainder = (range.startContainer as Text).splitText(range.startOffset);
		range.setStart(remainder, 0);
	}

	if (isTextNode(range.endContainer) && range.endOffset < (range.endContainer as Text).length) {
		(range.endContainer as Text).splitText(range.endOffset);
	}
}

export function splitInlineParentBefore(child: Node): void {
	const parent = child.parentElement;
	if (!parent?.parentNode) return;

	const tail = parent.cloneNode(false) as HTMLElement;
	while (child) {
		const next = child.nextSibling;
		tail.appendChild(child);
		child = next!;
	}

	if (tail.childNodes.length > 0) {
		parent.parentNode.insertBefore(tail, parent.nextSibling);
	}
}

export function rangeFullyContainsNode(range: Range, node: Node): boolean {
	if (!range.intersectsNode(node)) return false;

	const nodeRange = (node.ownerDocument ?? document).createRange();
	if (isElementNode(node)) {
		nodeRange.selectNodeContents(node);
	} else {
		nodeRange.selectNode(node);
	}

	return (
		range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0 &&
		range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0
	);
}

export function elementDepth(element: HTMLElement): number {
	let depth = 0;
	let current: Node | null = element;
	while (current?.parentNode) {
		depth++;
		current = current.parentNode;
	}
	return depth;
}

export function getWalkRoot(
	root: HTMLElement,
	range: Range,
	isBlock: (tagName: string) => boolean
): Node | null {
	if (range.collapsed) {
		return getBlockAtRange(root, range, isBlock);
	}

	const ancestor = range.commonAncestorContainer;
	return isElementNode(ancestor) ? ancestor : ancestor.parentElement;
}
