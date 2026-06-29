import type { Editor } from '../core/editor.js';
import { clampOffsets } from './offset-map.js';
import type { Action, SelectionOffsets } from './types.js';

export function captureSelection(editor: Editor): SelectionOffsets {
	return editor.getSelectionOffsets() ?? { start: 0, end: 0 };
}

export function restoreSelection(editor: Editor, offsets: SelectionOffsets): void {
	const clamped = clampOffsets(editor.root, offsets);
	editor.root.focus();
	editor.setSelectionOffsets(clamped);
	editor.applySelection(true);
}

export function remapSelectionThroughOps(
	selection: SelectionOffsets,
	ops: Action[],
	forward: boolean
): SelectionOffsets {
	let { start, end } = selection;
	const ordered = forward ? ops : [...ops].reverse();

	for (const op of ordered) {
		const delta = getOpSelectionDelta(op, forward);
		if (!delta) continue;
		start = remapPoint(start, op, delta, forward);
		end = remapPoint(end, op, delta, forward);
	}

	return { start, end };
}

function getOpSelectionDelta(
	op: Action,
	forward: boolean
): { offset: number; delta: number } | null {
	switch (op.type) {
		case 'insertText':
			return { offset: op.offset, delta: forward ? op.text.length : -op.text.length };
		case 'deleteRange':
			return { offset: op.start, delta: forward ? -(op.end - op.start) : op.end - op.start };
		case 'insertFragment': {
			const len = countHtmlTextLength(op.html);
			return { offset: op.offset, delta: forward ? len : -len };
		}
		case 'replaceRange': {
			const oldLen = op.end - op.start;
			const newLen = countHtmlTextLength(op.html);
			return { offset: op.start, delta: forward ? newLen - oldLen : oldLen - newLen };
		}
		default:
			return null;
	}
}

function remapPoint(
	point: number,
	op: Action,
	delta: { offset: number; delta: number },
	forward: boolean
): number {
	const { offset, delta: d } = delta;
	if (point < offset) return point;
	if (forward) {
		if (op.type === 'deleteRange' && point > op.end) {
			return point + d;
		}
		if (op.type === 'deleteRange' && point > op.start && point <= op.end) {
			return op.start;
		}
	}
	return point + d;
}

function countHtmlTextLength(html: string): number {
	if (!html) return 0;
	const template = document.createElement('div');
	template.innerHTML = html;
	let total = 0;
	const walker = document.createTreeWalker(template, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) {
		total += (walker.currentNode as Text).data.length;
	}
	return total;
}
