const SELF_CLOSING_TAGS = [
	'area',
	'base',
	'br',
	'col',
	'command',
	'embed',
	'hr',
	'img',
	'input',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
] as const;

const isTextNode = (node: Node | null | undefined): node is Text =>
	!!node && node.nodeType === Node.TEXT_NODE;

const isElementNode = (node: Node | null | undefined): node is Element =>
	!!node && node.nodeType === Node.ELEMENT_NODE;

const isOnlyChild = (node: Node): boolean =>
	!!node.parentElement && node.parentElement.childNodes.length === 1;

const isReadonlyElement = (node: Node | null | undefined): boolean =>
	isElementNode(node) && (node as Element).hasAttribute('data-readonly');

const isInsideReadonly = (node: Node | null | undefined): boolean => {
	if (!node) return false;
	const parents = getParentElements(node);
	return parents.some((ancestor) => isReadonlyElement(ancestor));
};

const getClosestBlockElement = (node: Node | null, root: HTMLElement): HTMLElement | null => {
	if (!node) return null;
	const parents = getParentElementsUntil(node, root);
	for (const ancestor of parents) {
		if (isElementNode(ancestor)) {
			const el = ancestor as HTMLElement;
			const display = getComputedStyle(el).display;
			if (display !== 'inline') {
				return el;
			}
		}
	}
	return null;
};

const isSelfClosing = (node: Node): boolean => {
	if (node.nodeType === Node.TEXT_NODE) return false;
	if (!isElementNode(node)) return false;
	return SELF_CLOSING_TAGS.includes(
		node.tagName.toLowerCase() as (typeof SELF_CLOSING_TAGS)[number]
	);
};

const isEmpty = (node: Node): boolean => {
	if (isSelfClosing(node)) return false;

	if (!('hasChildNodes' in node) || !node.hasChildNodes()) return true;

	return Array.from(node.childNodes).every((child) => {
		if (isTextNode(child)) {
			return child.textContent.trim() === '';
		} else {
			return isEmpty(child);
		}
	});
};

const wrapOutWith = (dom: Node, wrapperDOM: HTMLElement): HTMLElement => {
	const parent = dom.parentNode;
	if (!parent) return wrapperDOM;
	parent.insertBefore(wrapperDOM, dom);
	wrapperDOM.appendChild(dom);
	return wrapperDOM;
};

const wrapInWith = (dom: Node, wrapperDOM: HTMLElement): Node => {
	if (dom.nodeType === Node.TEXT_NODE) return dom;
	if (isSelfClosing(dom)) return dom;
	copyPasteChildNodes(wrapperDOM, dom as Node & ParentNode);
	if (isElementNode(dom) || dom.nodeType === 11) {
		dom.appendChild(wrapperDOM);
	}
	return dom;
};

const unwrap = (node: Node): void => {
	const parent = node.parentNode;
	if (!parent) return;
	while (node.firstChild) {
		parent.insertBefore(node.firstChild, node);
	}
	parent.removeChild(node);
};

const copyPasteChildNodes = (
	pasteDOM: Node & ParentNode,
	copyDOM: Node & ParentNode
): Node & ParentNode => {
	while (copyDOM.firstChild) {
		pasteDOM.appendChild(copyDOM.firstChild);
	}
	return pasteDOM;
};

const composedPath = (node: Node | null): (Node | null)[] => {
	return getParentElements(node);
};

const getParents = (
	node: Node | null,
	parentType: 'parentNode' | 'parentElement' = 'parentNode'
): Node[] => {
	const path: Node[] = [];
	let currentNode: Node | null = node;

	while (currentNode) {
		if (parentType === 'parentElement' && currentNode.nodeType === Node.TEXT_NODE) {
			currentNode = currentNode.parentElement;
			continue;
		} else {
			path.push(currentNode);
			currentNode =
				parentType === 'parentElement'
					? currentNode.parentElement
					: (currentNode.parentNode as Node | null);
		}
	}

	return path;
};

const getParentsUntil = (
	node: Node | null,
	parentNode: Node | null,
	parentType: 'parentNode' | 'parentElement' = 'parentNode'
): Node[] => {
	if (!node || !parentNode) return [];

	const path: Node[] = [];
	let currentNode: Node | null = node;

	while (currentNode && currentNode !== parentNode) {
		if (parentType === 'parentElement' && currentNode.nodeType === Node.TEXT_NODE) {
			currentNode = currentNode.parentElement;
			continue;
		} else {
			path.push(currentNode);
			currentNode =
				parentType === 'parentElement'
					? currentNode.parentElement
					: (currentNode.parentNode as Node | null);
		}
	}

	return path;
};

const getParentNodes = (node: Node | null): Node[] => getParents(node, 'parentNode');

const getParentElements = (node: Node | null): Node[] => getParents(node, 'parentElement');

const getParentNodesUntil = (node: Node | null, parentNode: Node | null): Node[] =>
	getParentsUntil(node, parentNode, 'parentNode');

const getParentElementsUntil = (node: Node | null, parentNode: Node | null): Node[] =>
	getParentsUntil(node, parentNode, 'parentElement');

const isMergeable = (node1: Node, node2: Node): boolean => {
	if (node1 === node2) return false;
	if (node1.nodeType !== node2.nodeType) return false;

	if (isTextNode(node1) && isTextNode(node2)) return true;

	if (isElementNode(node1) && isElementNode(node2)) {
		const el1 = node1 as HTMLElement;
		const el2 = node2 as HTMLElement;

		if (el1.getAttribute('data-protected') === 'true' || el2.getAttribute('data-protected') === 'true') {
			return false;
		}

		const tagName = el1.tagName.toUpperCase();
		if (tagName !== el2.tagName.toUpperCase()) return false;

		const mergeableTags = new Set([
			'UL', 'OL', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'A', 'MARK', 'CODE', 'SMALL'
		]);

		if (!mergeableTags.has(tagName)) return false;

		if (tagName === 'A') return el1.getAttribute('href') === el2.getAttribute('href');

		if (el1.attributes.length !== el2.attributes.length) return false;
		for (let i = 0; i < el1.attributes.length; i++) {
			const attr = el1.attributes[i];
			if (el2.getAttribute(attr.name) !== attr.value) return false;
		}

		return true;
	}

	return false;
};

const mergeNodes = (node1: Node, node2: Node): boolean => {
	if (isTextNode(node1) && isTextNode(node2)) {
		node1.textContent += node2.textContent || '';
		node2.parentNode?.removeChild(node2);
		return true;
	} else if (isElementNode(node1) && isElementNode(node2)) {
		const a = node1 as HTMLElement;
		const b = node2 as HTMLElement;
		while (b.firstChild) {
			a.appendChild(b.firstChild);
		}
		b.remove();
		return true;
	}
	return false;
};

const mergeAdjacentChildren = (parent: Node, recursive = true): boolean => {
	parent.normalize();
	let current = parent.firstChild;
	let merged = false;
	while (current && current.nextSibling) {
		const next = current.nextSibling;
		const mergeable = isMergeable(current, next);

		if (mergeable) {
			mergeNodes(current, next);
			merged = true;
		} else {
			if (recursive && isElementNode(current)) {
				if (mergeAdjacentChildren(current, true)) merged = true;
			}
			current = next;
		}
	}
	if (recursive && current && isElementNode(current)) {
		if (mergeAdjacentChildren(current, true)) merged = true;
	}

	// Flatten nested tags of the same type
	if (isElementNode(parent)) {
		const tagName = (parent as HTMLElement).tagName.toUpperCase();
		const mergeableTags = new Set([
			'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'A', 'MARK', 'CODE', 'SMALL'
		]);

		if (mergeableTags.has(tagName)) {
			let child = parent.firstChild;
			while (child) {
				const nextChild = child.nextSibling;
				if (isElementNode(child) && (child as HTMLElement).tagName.toUpperCase() === tagName) {
					// Check if attributes match exactly to be safe, or just unwrap it
					// For simple formatting tags, unwrapping is usually what we want
					unwrap(child);
					merged = true;
				}
				child = nextChild;
			}
		}
	}

	return merged;
};

function getTextLength(node: Node): number {
	if (node.nodeType === Node.TEXT_NODE) {
		return (node as Text).data.length;
	}
	let len = 0;
	// Use explicit loop for performance
	const children = node.childNodes;
	for (let i = 0; i < children.length; i++) {
		len += getTextLength(children[i]);
	}
	return len;
}

function countEditableText(node: Node): number {
	if (isElementNode(node) && (node as HTMLElement).getAttribute('contenteditable') === 'false') {
		return 0;
	}
	if (isTextNode(node)) {
		return node.data.length;
	}
	let total = 0;
	for (let i = 0; i < node.childNodes.length; i++) {
		total += countEditableText(node.childNodes[i]);
	}
	return total;
}

export {
	isTextNode,
	isElementNode,
	isOnlyChild,
	isReadonlyElement,
	isInsideReadonly,
	getClosestBlockElement,
	isEmpty,
	getParents,
	getParentsUntil,
	getParentNodes,
	getParentElements,
	getParentNodesUntil,
	getParentElementsUntil,
	composedPath,
	copyPasteChildNodes,
	wrapInWith,
	wrapOutWith,
	unwrap,
	isSelfClosing,
	isMergeable,
	mergeNodes,
	mergeAdjacentChildren,
	getTextLength,
	countEditableText
};
