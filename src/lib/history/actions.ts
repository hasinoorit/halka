import type { Action } from './types.js';

export function invertAction(action: Action): Action {
	switch (action.type) {
		case 'insertText':
			return {
				type: 'deleteRange',
				start: action.offset,
				end: action.offset + action.text.length,
				text: action.text
			};
		case 'deleteRange':
			return { type: 'insertText', offset: action.start, text: action.text };
		case 'insertFragment': {
			const length = countFragmentEditableLength(action.html);
			return {
				type: 'deleteRange',
				start: action.offset,
				end: action.offset + length,
				text: extractFragmentEditableText(action.html)
			};
		}
		case 'replaceRange':
			return {
				type: 'replaceRange',
				start: action.start,
				end: action.start + countFragmentEditableLength(action.html),
				html: action.previousHtml,
				previousHtml: action.html
			};
		case 'setSelection':
			return { type: 'setSelection', start: action.start, end: action.end };
		case 'wrap':
			return { type: 'unwrap', start: action.start, end: action.end, tag: action.tag };
		case 'unwrap':
			return { type: 'wrap', start: action.start, end: action.end, tag: action.tag };
		case 'splitBlock':
			return { type: 'joinBlocks', offset: action.offset };
		case 'joinBlocks':
			return { type: 'splitBlock', offset: action.offset };
		case 'insertTable':
			return {
				type: 'deleteRange',
				start: action.offset,
				end: action.offset,
				text: ''
			};
		case 'insertNode':
			return {
				type: 'removeNode',
				path: action.parentPath,
				html: action.html
			};
		case 'removeNode':
			return {
				type: 'insertNode',
				parentPath: action.path.slice(0, -1),
				index: action.path[action.path.length - 1] ?? 0,
				html: action.html
			};
		default:
			return action;
	}
}

export function invertActions(actions: Action[]): Action[] {
	const inverted: Action[] = [];
	for (let i = actions.length - 1; i >= 0; i--) {
		inverted.push(invertAction(actions[i]));
	}
	return inverted;
}

function countFragmentEditableLength(html: string): number {
	if (!html) return 0;
	const doc = document.implementation.createHTMLDocument('');
	const template = doc.createElement('div');
	template.innerHTML = html;
	let total = 0;
	const walker = doc.createTreeWalker(template, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) {
		total += (walker.currentNode as Text).data.length;
	}
	return total;
}

function extractFragmentEditableText(html: string): string {
	if (!html) return '';
	const doc = document.implementation.createHTMLDocument('');
	const template = doc.createElement('div');
	template.innerHTML = html;
	const parts: string[] = [];
	const walker = doc.createTreeWalker(template, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) {
		parts.push((walker.currentNode as Text).data);
	}
	return parts.join('');
}
