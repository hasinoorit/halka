import { createRangeByOffsets } from '../helpers/range.js';
import type { Editor } from '../core/editor.js';
import { diffToActions } from './diff.js';
import { getEditableTextLength } from './offset-map.js';
import type { Action, Diff } from './types.js';

export function applyActions(editor: Editor, actions: Action[]): void {
	for (const action of actions) {
		applyAction(editor, action);
	}
}

function applyAction(editor: Editor, action: Action): void {
	const root = editor.root;
	const doc = root.ownerDocument;

	switch (action.type) {
		case 'insertText': {
			const range = createRangeByOffsets(root, action.offset, action.offset);
			if (!range) return;
			range.insertNode(doc.createTextNode(action.text));
			break;
		}
		case 'deleteRange': {
			const range = createRangeByOffsets(root, action.start, action.end);
			if (!range) return;
			range.deleteContents();
			break;
		}
		case 'insertFragment': {
			const range = createRangeByOffsets(root, action.offset, action.offset);
			if (!range) return;
			const fragment = range.createContextualFragment(action.html);
			range.insertNode(fragment);
			break;
		}
		case 'replaceRange': {
			const totalLen = getEditableTextLength(root);
			if (action.start === 0 && action.end >= totalLen) {
				root.innerHTML = action.html;
				break;
			}
			const range = createRangeByOffsets(root, action.start, action.end);
			if (!range) return;
			range.deleteContents();
			if (action.html) {
				const fragment = range.createContextualFragment(action.html);
				range.insertNode(fragment);
			}
			break;
		}
		case 'setSelection':
			editor.setSelectionOffsets({ start: action.start, end: action.end });
			break;
		case 'wrap':
		case 'unwrap':
		case 'splitBlock':
		case 'joinBlocks':
		case 'insertTable':
		case 'insertNode':
		case 'removeNode':
			// Structural actions fall back to replaceRange when captured as html-replace
			break;
		default:
			break;
	}
}

export function applyDiff(editor: Editor, diff: Diff): void {
	applyActions(editor, diffToActions(diff));
}
