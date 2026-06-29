import { countEditableText, isElementNode } from '../helpers/node.js';
import type { SelectionOffsets } from './types.js';

export function getEditableTextLength(root: HTMLElement): number {
	return countEditableText(root);
}

export function extractEditableText(root: HTMLElement): string {
	const parts: string[] = [];
	walkEditableText(root, (text) => {
		parts.push(text);
	});
	return parts.join('');
}

function walkEditableText(node: Node, onText: (text: string) => void): void {
	if (isElementNode(node) && (node as HTMLElement).getAttribute('contenteditable') === 'false') {
		return;
	}
	if (node.nodeType === Node.TEXT_NODE) {
		onText((node as Text).data);
		return;
	}
	for (let i = 0; i < node.childNodes.length; i++) {
		walkEditableText(node.childNodes[i], onText);
	}
}

export function clampOffsets(root: HTMLElement, offsets: SelectionOffsets): SelectionOffsets {
	const max = getEditableTextLength(root);
	const start = Math.max(0, Math.min(offsets.start, max));
	const end = Math.max(start, Math.min(offsets.end, max));
	return { start, end };
}
