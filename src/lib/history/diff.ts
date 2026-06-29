import { invertActions } from './actions.js';
import type { Action, Diff, EditableSnapshot, TextPatchDiff } from './types.js';

export function invertDiff(diff: Diff): Action[] {
	switch (diff.kind) {
		case 'text':
			return invertActions([textPatchToAction(diff)]);
		case 'html-insert':
			return invertActions([
				{
					type: 'insertFragment',
					offset: diff.offset,
					html: diff.html
				}
			]);
		case 'html-replace':
			return invertActions([
				{
					type: 'replaceRange',
					start: diff.start,
					end: diff.end,
					html: diff.html,
					previousHtml: diff.previousHtml
				}
			]);
		case 'composite': {
			const actions: Action[] = [];
			for (const op of diff.ops) {
				actions.push(...invertDiff(op));
			}
			return actions;
		}
		default:
			return [];
	}
}

export function diffToActions(diff: Diff): Action[] {
	switch (diff.kind) {
		case 'text':
			return [textPatchToAction(diff)];
		case 'html-insert':
			return [{ type: 'insertFragment', offset: diff.offset, html: diff.html }];
		case 'html-replace':
			return [
				{
					type: 'replaceRange',
					start: diff.start,
					end: diff.end,
					html: diff.html,
					previousHtml: diff.previousHtml
				}
			];
		case 'composite': {
			const actions: Action[] = [];
			for (const op of diff.ops) {
				actions.push(...diffToActions(op));
			}
			return actions;
		}
		default:
			return [];
	}
}

function textPatchToAction(patch: TextPatchDiff): Action {
	if (patch.deleteCount > 0) {
		return {
			type: 'replaceRange',
			start: patch.start,
			end: patch.start + patch.deleteCount,
			html: patch.insertText,
			previousHtml: patch.deletedText
		};
	}
	return { type: 'insertText', offset: patch.start, text: patch.insertText };
}

export function computeTextPatch(before: string, after: string): TextPatchDiff | null {
	if (before === after) return null;

	let prefix = 0;
	const minLen = Math.min(before.length, after.length);
	while (prefix < minLen && before[prefix] === after[prefix]) {
		prefix++;
	}

	let suffix = 0;
	while (
		suffix < minLen - prefix &&
		before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
	) {
		suffix++;
	}

	const deleteCount = before.length - prefix - suffix;
	const insertText = after.slice(prefix, after.length - suffix);
	const deletedText = before.slice(prefix, before.length - suffix);

	return {
		kind: 'text',
		start: prefix,
		deleteCount,
		insertText,
		deletedText
	};
}

export function computeDiff(
	before: EditableSnapshot,
	after: EditableSnapshot,
	beforeHtml: string,
	afterHtml: string
): Diff | null {
	if (before.text === after.text && beforeHtml === afterHtml) {
		return null;
	}

	const textPatch = computeTextPatch(before.text, after.text);
	if (textPatch) {
		const reconstructed =
			before.text.slice(0, textPatch.start) +
			textPatch.insertText +
			before.text.slice(textPatch.start + textPatch.deleteCount);
		if (reconstructed === after.text && beforeHtml === afterHtml) {
			return textPatch;
		}
	}

	if (beforeHtml === afterHtml) {
		return textPatch;
	}

	return {
		kind: 'html-replace',
		start: 0,
		end: before.text.length,
		html: afterHtml,
		previousHtml: beforeHtml
	};
}
