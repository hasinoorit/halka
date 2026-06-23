import {
	copyPasteChildNodes,
	getParentElements,
	getParentElementsUntil,
	getParentsUntil,
	getParents,
	isOnlyChild,
	isElementNode,
	isTextNode,
	isEmpty,
	unwrap,
	countEditableText
} from './node.js';

const ZERO_WITH_TEXT_NODE = (win?: Window): Text => (win ?? window).document.createTextNode('\u200B');

const isWrappedWith = (
	tagName: string,
	parentDOM?: HTMLElement,
	win?: Window
): Element | boolean | undefined => {
	const range = getRange(win);
	if (!range) return;

	const node = range.commonAncestorContainer;

	const selectedTag = isSelectedWholeContentAnElement(win);
	if (selectedTag && selectedTag.tagName === tagName) {
		return selectedTag;
	} else if (selectedTag) {
		return (getParentElements(range.commonAncestorContainer) || []).some(
			(el) => (el as Element).tagName === tagName
		);
	}

	if (parentDOM) {
		if (!node || !parentDOM.contains(node)) return false;
		return getParentsUntil(range.commonAncestorContainer, parentDOM).some(
			(element) => (element as Element).tagName === tagName
		);
	} else {
		return getParents(range.commonAncestorContainer).some(
			(element) => (element as Element).tagName === tagName
		);
	}
};

const isWrappedWithClassName = (
	className: string,
	parentDOM?: HTMLElement,
	win?: Window
): boolean | undefined => {
	const range = getRange(win);
	if (!range) return;

	const dom = isSelectedWholeContentAnElement(win);
	if (isElementNode(dom) && dom.classList.contains(className)) return true;

	const node = range.commonAncestorContainer;
	if (parentDOM) {
		return getParentElementsUntil(node, parentDOM).some(
			(node) => isElementNode(node) && node.classList.contains(className)
		);
	} else {
		return getParentElements(node).some(
			(node) => isElementNode(node) && node.classList.contains(className)
		);
	}
};

const isSelectedAnElement = (range: Range): Element | undefined => {
	const textNode = isAllSelectedATextNode(range);
	if (textNode && isOnlyChild(textNode)) return textNode.parentElement ?? undefined;

	const contentDocument = range.cloneContents();
	const elementNodes = Array.from(contentDocument.childNodes).filter((node: Node) => {
		return !(node.nodeType === Node.TEXT_NODE && node.textContent === '');
	});
	if (elementNodes.some((node: Node) => node.nodeType === Node.TEXT_NODE)) return;
	const startContainer = range.startContainer as Node & ParentNode;
	return (elementNodes.length === 1 &&
		isElementNode(startContainer.childNodes[range.startOffset]) &&
		(startContainer.childNodes[range.startOffset] as Element)) as Element | undefined;
};

const isAllSelectedATextNode = (range: Range): Text | undefined => {
	const { startContainer, startOffset } = range;
	const { childNodes } = range.cloneContents();

	if (Array.from(childNodes).some((node) => isElementNode(node))) return;

	const textNode = isTextNode(startContainer)
		? startContainer
		: (startContainer.childNodes[startOffset] as Node | undefined);

	if (textNode && isTextNode(textNode)) {
		const selectedText = textNode.textContent;
		const firstNodeText = childNodes.length > 0 ? (childNodes[0]?.textContent ?? null) : null;

		if (
			selectedText !== null &&
			firstNodeText !== null &&
			selectedText.trim() === firstNodeText.trim()
		) {
			return textNode;
		}
	}
};

const isSelectedWholeContentAnElement = (win?: Window): Element | undefined => {
	const range = getRange(win);
	if (!range) return;

	const { startContainer, startOffset, endContainer, endOffset } = range;

	const startParent = (startContainer as Node).parentElement;
	const endParent = (endContainer as Node).parentElement;

	if (
		startParent &&
		endParent &&
		Array.from(startParent.childNodes).indexOf(startContainer as ChildNode) === 0 &&
		startOffset === 0 &&
		Array.from(endParent.childNodes).indexOf(endContainer as ChildNode) ===
		endParent.childNodes.length - 1 &&
		endContainer.nodeType === Node.TEXT_NODE &&
		endContainer.textContent !== null &&
		endContainer.textContent.length === endOffset &&
		endParent === startParent
	) {
		return startParent;
	}

	return isSelectedAnElement(range);
};

const getRange = (win?: Window): Range | undefined => {
	const selection = (win ?? window).getSelection();
	if (!selection || selection.rangeCount === 0) return;
	return selection.getRangeAt(0);
};

const surround = (elementDOM: HTMLElement, win?: Window, providedRange?: Range): void => {
	const range = providedRange || getRange(win);
	if (!range) return;

	let zwsTextNode: Text | null = null;

	if (range.collapsed) {
		zwsTextNode = ZERO_WITH_TEXT_NODE(win);
		range.insertNode(zwsTextNode);
		range.selectNode(zwsTextNode);
	}

	wrapSelectionWith(elementDOM, win, range);

	if (zwsTextNode && zwsTextNode.parentElement === elementDOM) {
		range.setStart(zwsTextNode, zwsTextNode.length);
		range.collapse(true);
	} else {
		range.selectNodeContents(elementDOM);
		range.collapse(false);
	}

	focusEditableElement(win);
};

const wrapSelectionWith = (elementDOM: HTMLElement, win?: Window, providedRange?: Range): void => {
	const range = providedRange || getRange(win);
	if (!range) return;
	const content = range.extractContents();
	copyPasteChildNodes(elementDOM, content);
	range.insertNode(elementDOM);
};

const wholeNestedElements = (range: Range): Node[] | undefined => {
	const selectedElement = isSelectedAnElement(range);
	if (!selectedElement) return;

	const elements: Node[] = [selectedElement];
	let currentElement: Node | null = selectedElement;

	while (
		isElementNode(currentElement) &&
		currentElement.parentElement &&
		currentElement.parentElement.childNodes.length === 1
	) {
		elements.unshift(currentElement.parentElement);
		currentElement = currentElement.parentElement;
	}

	currentElement = selectedElement;

	while (
		isElementNode(currentElement) &&
		currentElement.childNodes.length === 1 &&
		currentElement.firstChild
	) {
		currentElement = currentElement.firstChild;
		elements.push(currentElement);
	}

	return elements;
};

const splitText = (win?: Window): [Text, Text] | undefined => {
	const range = getRange(win);
	if (!range) return;

	const start = range.startContainer;
	if (!isTextNode(start)) return;
	const secondPart = start.splitText(range.startOffset);
	return [start, secondPart];
};

const nextSlice = (
	node: Node,
	until: string | { tagName: string; className?: string },
	newEl?: Node,
	childEl?: Node
): [Node, Node, Node | DocumentFragment] => {
	const doc = node.ownerDocument ?? document;
	if (!newEl) newEl = doc.createTextNode('');
	if (!childEl) childEl = doc.createTextNode('\u200B');
	const parentElement = node.parentElement;
	if (!parentElement) {
		return [node, childEl, new DocumentFragment()];
	}
	const el = parentElement.cloneNode() as HTMLElement;
	const emptyEl = el.cloneNode() as HTMLElement;
	emptyEl.append(childEl);
	el.append(newEl);
	while (node.nextSibling) {
		el.append(node.nextSibling);
	}

	if (parentElement && matchElements(el, until)) {
		let prevNode: Node = parentElement;
		let nextNode: Node | DocumentFragment = el;

		if (isEmpty(parentElement)) {
			const previous = parentElement.previousSibling;
			prevNode = previous ?? parentElement;
			parentElement.remove();
		}

		if (isEmpty(el)) {
			nextNode = new DocumentFragment();
			el.remove();
		}

		return [prevNode, childEl, nextNode];
	} else {
		return nextSlice(parentElement, until, el, emptyEl);
	}
};

const undo = (
	until: string | { tagName: string; className?: string },
	win?: Window
): void => {
	const range = getRange(win);
	if (!range) return;

	if (range.collapsed) {
		splitBetweenWith(until, win);
		focusEditableElement(win);
		return;
	}

	const nested = wholeNestedElements(range);
	if (nested) {
		const matching = nested.find(
			(node) => isElementNode(node) && matchElements(node, until)
		) as Element | undefined;

		if (matching) {
			const leaf = nested[nested.length - 1];

			const startNode: Node = isTextNode(leaf)
				? leaf
				: leaf.firstChild && isTextNode(leaf.firstChild)
					? leaf.firstChild
					: leaf;
			const endNode: Node = startNode;
			const startOffset = 0;
			const endOffset =
				isTextNode(startNode) && startNode.textContent ? startNode.textContent.length : 0;

			unwrap(matching);

			const selection = (win ?? window).getSelection();
			if (selection) {
				selection.removeAllRanges();
				const newRange = (win ?? window).document.createRange();
				if (isTextNode(startNode) && isTextNode(endNode)) {
					newRange.setStart(startNode, startOffset);
					newRange.setEnd(endNode, endOffset);
				} else if (!!startNode && !!endNode) {
					newRange.selectNodeContents(startNode);
				}
				selection.addRange(newRange);
			}

			focusEditableElement(win);
			return;
		}
	}

	const element = isSelectedAnElement(range);

	if (isElementNode(element) && matchElements(element, until)) {
		range.selectNode(element);
	}

	let extractedDoc = range.extractContents();

	if (
		extractedDoc.childNodes.length === 1 &&
		extractedDoc.firstElementChild &&
		matchElements(extractedDoc.firstElementChild, until)
	) {
		extractedDoc = Array.from(extractedDoc.childNodes[0].childNodes).reduce(
			(acc: DocumentFragment, node: Node) => {
				acc.append(node);
				return acc;
			},
			(extractedDoc.ownerDocument ?? document).createDocumentFragment()
		);

		range.insertNode(extractedDoc);
	} else {
		let startNode: Node;

		if (isTextNode(range.startContainer)) {
			const result = splitText(win);
			if (!result) return;
			startNode = result[0];
		} else {
			const index = range.startOffset - 1;
			startNode = range.startContainer.childNodes[index] as Node;
		}
		const [mountedDOM, , nextDOM] = nextSlice(startNode, until);

		mountedDOM.parentNode?.insertBefore(nextDOM, mountedDOM.nextSibling);
		mountedDOM.parentNode?.insertBefore(extractedDoc, mountedDOM.nextSibling);

		range.setStartAfter(mountedDOM);
		range.setEndBefore(nextDOM);
	}

	focusEditableElement(win);
};

const matchElements = (
	el: Element,
	obj: string | { tagName: string; className?: string }
): boolean => {
	if (typeof obj === 'string') obj = { tagName: obj };

	const classMatches =
		el.classList.length === 0 || (!!obj.className && el.classList.contains(obj.className));

	return el.tagName === obj.tagName && classMatches;
};

const splitBetweenWith = (
	tagName: string | { tagName: string; className?: string },
	win?: Window
): void => {
	const split = splitText(win);
	if (!split) return;
	const [node] = split;
	const [dom, emptyDOM, newDOM] = nextSlice(node, tagName);
	dom.parentNode?.insertBefore(newDOM, dom.nextSibling);
	dom.parentNode?.insertBefore(emptyDOM, dom.nextSibling);
	const range = getRange(win);
	if (!range) return;
	let textNode: Node = emptyDOM;
	while ((textNode as ParentNode).firstChild) {
		textNode = (textNode as ParentNode).firstChild as Node;
	}
	if (isTextNode(textNode)) {
		range.selectNode(textNode);
	}
};

const focusEditableElement = (win?: Window): void => {
	const range = getRange(win);
	if (!range) return;
	let editableEl: Node | null = range.commonAncestorContainer;

	while (
		editableEl &&
		editableEl.parentElement &&
		(editableEl.parentElement as HTMLElement).isContentEditable
	) {
		editableEl = editableEl.parentElement;
	}

	if (isElementNode(editableEl)) {
		(editableEl as HTMLElement).focus();
	}
};

const unwrapWith = (tagName: string, win?: Window): void => {
	const range = getRange(win);
	if (!range) return;

	let element: Node | null = range.commonAncestorContainer;

	while (element && !(isElementNode(element) && element.tagName === tagName)) {
		const isEditable =
			isElementNode(element)
				? (element as HTMLElement).isContentEditable
				: isElementNode(element.parentElement)
					? (element.parentElement as HTMLElement).isContentEditable
					: false;

		if (!isEditable && !isTextNode(element)) {
			element = null;
			break;
		}

		element = element.parentElement;
	}

	if (!element || !isElementNode(element)) return;
	unwrap(element);
};

function findTextPositionAtOffset(
	editor: HTMLElement,
	offset: number,
	noLast: boolean = false,
	noFirst: boolean = false
): { node: Text; offsetInNode: number } | null {
	const doc = editor.ownerDocument;

	// Skip text nodes inside contenteditable=false (e.g. footnote citations, footnote list)
	// so that offset counting only accounts for the editable content the user sees.
	const filter = {
		acceptNode(node: Node) {
			// Reject zero-length text nodes
			if ((node as Text).data.length === 0) return NodeFilter.FILTER_REJECT;
			// Walk up to check for contenteditable=false ancestors
			let parent: Node | null = node.parentNode;
			while (parent && parent !== editor) {
				if (
					isElementNode(parent) &&
					(parent as HTMLElement).getAttribute('contenteditable') === 'false'
				) {
					return NodeFilter.FILTER_REJECT;
				}
				parent = parent.parentNode;
			}
			return NodeFilter.FILTER_ACCEPT;
		}
	};

	const walker = doc.createTreeWalker(editor, NodeFilter.SHOW_TEXT, filter);

	let currentOffset = 0;
	let lastValidNode: Text | null = null;

	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		const len = node.data.length;

		// Check if the offset falls within this node
		if (currentOffset <= offset && offset <= currentOffset + len) {
			const targetOffset = offset - currentOffset;

			// Rule: noFirst - avoid index 0
			if (noFirst && targetOffset === 0 && lastValidNode) {
				return { node: lastValidNode, offsetInNode: lastValidNode.length };
			}

			// Rule: noLast - avoid index at length
			if (noLast && targetOffset === len) {
				const nextNode = walker.nextNode() as Text | null;
				if (nextNode) return { node: nextNode, offsetInNode: 0 };
				return null; // Cannot satisfy noLast at the very end
			}

			return { node, offsetInNode: targetOffset };
		}

		currentOffset += len;
		lastValidNode = node;
	}

	// Fallback for offset at the exact end of content
	if (offset === currentOffset && lastValidNode) {
		if (noLast) return null;
		return { node: lastValidNode, offsetInNode: lastValidNode.length };
	}

	return null;
}

function createRangeByOffsets(editor: HTMLElement, start: number, end: number): Range | null {
	let startPos = findTextPositionAtOffset(editor, start, true, false);
	let endPos = findTextPositionAtOffset(editor, end, false, true);

	if (!startPos) startPos = findTextPositionAtOffset(editor, start, false, false);
	if (!endPos) endPos = findTextPositionAtOffset(editor, end, false, false);

	if (!startPos || !endPos) {
		const totalLength = countEditableText(editor);

		if (!startPos) {
			const clampedStart = Math.min(start, totalLength);
			startPos = findTextPositionAtOffset(editor, clampedStart, false, false);
		}

		if (!endPos) {
			const clampedEnd = Math.min(end, totalLength);
			endPos = findTextPositionAtOffset(editor, clampedEnd, false, false);
		}
	}

	if (!startPos || !endPos) return null;

	const range = editor.ownerDocument.createRange();
	range.setStart(startPos.node, startPos.offsetInNode);
	range.setEnd(endPos.node, endPos.offsetInNode);
	return range;
}

function restoreSelectionByOffsets(
	selection: Selection,
	editor: HTMLElement,
	start: number,
	end: number
) {
	const range = createRangeByOffsets(editor, start, end);

	if (!range) {
		const fallback = editor.ownerDocument.createRange();
		fallback.selectNodeContents(editor);
		fallback.collapse(false);
		selection.removeAllRanges();
		selection.addRange(fallback);
		return;
	}

	selection.removeAllRanges();
	selection.addRange(range);
}

export {
	getRange,
	isWrappedWith,
	isWrappedWithClassName,
	isAllSelectedATextNode,
	isSelectedAnElement,
	isSelectedWholeContentAnElement,
	surround,
	wrapSelectionWith,
	wholeNestedElements,
	nextSlice,
	splitBetweenWith,
	splitText,
	undo,
	unwrapWith,
	createRangeByOffsets,
	restoreSelectionByOffsets
};
