import { isElementNode, isTextNode, mergeAdjacentChildren, unwrap } from './node.js';
import {
	defaultIsBlock,
	elementDepth,
	getWalkRoot,
	rangeFullyContainsNode,
	shouldSkipElement,
	splitInlineParentBefore,
	splitRangeTextBoundaries
} from './clear-utils.js';

export const FORMAT_TAGS = new Set([
	'STRONG',
	'B',
	'EM',
	'I',
	'U',
	'S',
	'STRIKE',
	'CODE',
	'MARK',
	'SUB',
	'SUP',
	'SMALL'
]);

export interface ClearFormattingOptions {
	root: HTMLElement;
	range: Range;
	isBlock?: (tagName: string) => boolean;
	isFormatTag?: (tagName: string) => boolean;
}

function defaultIsFormatTag(tagName: string): boolean {
	return FORMAT_TAGS.has(tagName.toUpperCase());
}

function splitFormatParentsAtBoundary(
	boundaryNode: Node,
	isStart: boolean,
	isFormatTag: (tagName: string) => boolean
): void {
	if (!isTextNode(boundaryNode)) return;

	if (isStart) {
		let child: Node = boundaryNode;
		let parent = child.parentElement;

		while (parent && isFormatTag(parent.tagName) && !shouldSkipElement(parent)) {
			if (child !== parent.firstChild) {
				splitInlineParentBefore(child);
				break;
			}
			child = parent;
			parent = parent.parentElement;
		}
		return;
	}

	let child: Node = boundaryNode;
	let parent = child.parentElement;

	while (parent && isFormatTag(parent.tagName) && !shouldSkipElement(parent)) {
		if (child.nextSibling) {
			splitInlineParentBefore(child.nextSibling);
			break;
		}
		child = parent;
		parent = parent.parentElement;
	}
}

function getFormatElementsFullyInRange(
	range: Range,
	searchRoot: Node,
	isFormatTag: (tagName: string) => boolean
): HTMLElement[] {
	const results: HTMLElement[] = [];
	const doc = searchRoot.ownerDocument ?? document;
	const walker = doc.createTreeWalker(searchRoot, NodeFilter.SHOW_ELEMENT, {
		acceptNode(node) {
			if (!isElementNode(node)) return NodeFilter.FILTER_SKIP;
			const element = node as HTMLElement;
			if (!isFormatTag(element.tagName) || shouldSkipElement(element)) {
				return NodeFilter.FILTER_SKIP;
			}
			if (!range.intersectsNode(element)) return NodeFilter.FILTER_SKIP;
			if (!rangeFullyContainsNode(range, element)) return NodeFilter.FILTER_SKIP;
			return NodeFilter.FILTER_ACCEPT;
		}
	});

	let node = walker.nextNode();
	while (node) {
		results.push(node as HTMLElement);
		node = walker.nextNode();
	}

	return results;
}

function clearFormattingFromNode(node: Node, isFormatTag: (tagName: string) => boolean): void {
	if (!isElementNode(node)) return;

	const element = node as HTMLElement;
	if (shouldSkipElement(element)) return;

	const children = Array.from(element.childNodes);
	for (const child of children) {
		clearFormattingFromNode(child, isFormatTag);
	}

	if (!element.parentNode) return;

	if (isFormatTag(element.tagName)) {
		unwrap(element);
	}
}

function clearFormattingInBlock(block: HTMLElement, isFormatTag: (tagName: string) => boolean): void {
	if (shouldSkipElement(block)) return;

	const children = Array.from(block.childNodes);
	for (const child of children) {
		clearFormattingFromNode(child, isFormatTag);
	}

	mergeAdjacentChildren(block);
}

function clearFormattingInRange(
	range: Range,
	isFormatTag: (tagName: string) => boolean
): void {
	splitRangeTextBoundaries(range);

	const startNode = range.startContainer;
	const endNode = range.endContainer;
	const endOffset = range.endOffset;

	splitFormatParentsAtBoundary(startNode, true, isFormatTag);
	splitFormatParentsAtBoundary(endNode, false, isFormatTag);

	if (isTextNode(startNode) && isTextNode(endNode)) {
		range.setStart(startNode, 0);
		range.setEnd(endNode, endOffset);
	}

	const ancestor = range.commonAncestorContainer;
	const container = isTextNode(ancestor) ? ancestor.parentElement : ancestor;
	const searchRoot = container?.parentElement;
	if (!searchRoot) return;

	const toUnwrap = getFormatElementsFullyInRange(range, searchRoot, isFormatTag);
	toUnwrap.sort((a, b) => elementDepth(b) - elementDepth(a));

	for (const element of toUnwrap) {
		unwrap(element);
	}

	const cleanupRoot =
		searchRoot.nodeType === Node.ELEMENT_NODE
			? (searchRoot as HTMLElement)
			: searchRoot.parentElement;
	if (cleanupRoot) {
		mergeAdjacentChildren(cleanupRoot);
	}
}

/**
 * Remove semantic formatting tags from the current selection.
 * When the selection is collapsed, clears formatting from the root block and all descendants.
 * Does not remove inline style attributes.
 */
export function clearFormatting(options: ClearFormattingOptions): void {
	const {
		root,
		range,
		isBlock = defaultIsBlock,
		isFormatTag = defaultIsFormatTag
	} = options;

	if (range.collapsed) {
		const block = getWalkRoot(root, range, isBlock);
		if (!block || !isElementNode(block)) return;
		clearFormattingInBlock(block as HTMLElement, isFormatTag);
		return;
	}

	clearFormattingInRange(range, isFormatTag);
}
