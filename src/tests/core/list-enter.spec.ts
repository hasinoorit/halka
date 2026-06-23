import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

const setCursorInText = (
	editor: HalkaEditor,
	textNode: Text,
	offset: number
) => {
	const range = document.createRange();
	range.setStart(textNode, offset);
	range.collapse(true);
	editor.setSelection(range);
};

const dispatchEnter = (root: HTMLElement) => {
	const event = new InputEvent('beforeinput', {
		inputType: 'insertParagraph',
		bubbles: true,
		cancelable: true
	});
	root.dispatchEvent(event);
};

const getCaretListItem = (editor: HalkaEditor): HTMLElement | null => {
	const range = editor.getRange();
	let node: Node | null = range.startContainer;
	const root = editor.root;

	while (node && node !== root) {
		if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'LI') {
			return node as HTMLElement;
		}
		node = node.parentNode;
	}
	return null;
};

describe('list enter', () => {
	let root: HTMLElement;
	let editor: HalkaEditor;

	beforeEach(() => {
		root = createRoot();
		editor = new HalkaEditor(root, { shortcuts: false });
		root.focus();
	});

	afterEach(() => {
		editor.destroy();
		root.remove();
	});

	it('creates a new list item with caret in the second item when Enter at end', () => {
		editor.setHTML('<ul><li>One</li></ul>');
		const text = root.querySelector('li')!.firstChild as Text;
		setCursorInText(editor, text, text.length);

		dispatchEnter(root);

		const items = root.querySelectorAll('li');
		expect(items.length).toBe(2);
		expect(items[0].textContent).toBe('One');
		expect(isEmptyListItemText(items[1])).toBe(true);

		const caretLi = getCaretListItem(editor);
		expect(caretLi).toBe(items[1]);
	});

	it('splits list item content when Enter in the middle', () => {
		editor.setHTML('<ul><li>OneTwo</li></ul>');
		const text = root.querySelector('li')!.firstChild as Text;
		setCursorInText(editor, text, 3);

		dispatchEnter(root);

		const items = root.querySelectorAll('li');
		expect(items.length).toBe(2);
		expect(items[0].textContent).toBe('One');
		expect(items[1].textContent).toBe('Two');

		const caretLi = getCaretListItem(editor);
		expect(caretLi).toBe(items[1]);
	});

	it('works in ordered lists', () => {
		editor.setHTML('<ol><li>First</li></ol>');
		const text = root.querySelector('li')!.firstChild as Text;
		setCursorInText(editor, text, text.length);

		dispatchEnter(root);

		const items = root.querySelectorAll('li');
		expect(items.length).toBe(2);
		expect(getCaretListItem(editor)).toBe(items[1]);
	});

	it('keeps caret in new item after ensureDocumentStructure', () => {
		editor.setHTML('<ul><li>One</li></ul>');
		const text = root.querySelector('li')!.firstChild as Text;
		setCursorInText(editor, text, text.length);

		dispatchEnter(root);

		const items = root.querySelectorAll('li');
		editor.ensureDocumentStructure({ emit: false });

		expect(getCaretListItem(editor)).toBe(items[1]);
	});
});

function isEmptyListItemText(li: Element): boolean {
	const text = li.textContent ?? '';
	return text.trim() === '';
}
