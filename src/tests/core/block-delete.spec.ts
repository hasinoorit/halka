import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

const setCursorAtBlockStart = (editor: HalkaEditor, block: Element) => {
	const range = document.createRange();
	range.selectNodeContents(block);
	range.collapse(true);
	editor.setSelection(range);
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

const dispatchBackspace = (root: HTMLElement) => {
	const event = new InputEvent('beforeinput', {
		inputType: 'deleteContentBackward',
		bubbles: true,
		cancelable: true
	});
	root.dispatchEvent(event);
};

describe('selection block boundaries', () => {
	let root: HTMLElement;
	let editor: HalkaEditor;

	beforeEach(() => {
		root = createRoot();
		editor = new HalkaEditor(root, { shortcuts: false });
	});

	afterEach(() => {
		editor.destroy();
		root.remove();
	});

	it('detects block start in text node', () => {
		editor.setHTML('<p>hello</p>');
		const text = root.querySelector('p')!.firstChild as Text;
		setCursorInText(editor, text, 0);
		expect(editor.selection.isAtBlockStart()).toBe(true);
	});

	it('detects block start in empty paragraph with br', () => {
		editor.setHTML('<p><br></p>');
		const paragraph = root.querySelector('p')!;
		setCursorAtBlockStart(editor, paragraph);
		expect(editor.selection.isAtBlockStart()).toBe(true);
	});

	it('detects block end in text node', () => {
		editor.setHTML('<p>hello</p>');
		const text = root.querySelector('p')!.firstChild as Text;
		setCursorInText(editor, text, text.length);
		expect(editor.selection.isAtBlockEnd()).toBe(true);
	});
});

describe('block delete backward', () => {
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

	it('removes empty heading when backspacing at start of next paragraph', () => {
		editor.setHTML('<h1><br></h1><p>Second block</p>');
		const paragraph = root.querySelector('p')!;
		setCursorAtBlockStart(editor, paragraph);

		dispatchBackspace(root);

		expect(editor.getHTML()).toBe('<p>Second block</p>');
	});

	it('joins same-type root blocks', () => {
		editor.setHTML('<h1>Hello</h1><h1>World</h1>');
		const secondHeading = root.querySelectorAll('h1')[1];
		setCursorAtBlockStart(editor, secondHeading);

		dispatchBackspace(root);

		expect(root.querySelectorAll('h1').length).toBe(1);
		expect(root.textContent).toBe('HelloWorld');
	});

	it('moves cursor to previous block end for different block types', () => {
		editor.setHTML('<h1>Title</h1><p>Body</p>');
		const paragraph = root.querySelector('p')!;
		const headingText = root.querySelector('h1')!.firstChild as Text;
		setCursorAtBlockStart(editor, paragraph);

		dispatchBackspace(root);

		expect(root.querySelector('h1')).not.toBeNull();
		expect(root.querySelector('p')).not.toBeNull();
		const selection = editor.getSelection();
		expect(selection?.anchorNode).toBe(headingText);
		expect(selection?.anchorOffset).toBe(headingText.length);
	});

	it('removes empty current paragraph and moves cursor to previous content', () => {
		editor.setHTML('<p>Content</p><p><br></p>');
		const emptyParagraph = root.querySelectorAll('p')[1];
		setCursorAtBlockStart(editor, emptyParagraph);

		dispatchBackspace(root);

		expect(editor.getHTML()).toBe('<p>Content</p>');
		const selection = editor.getSelection();
		const contentText = root.querySelector('p')!.firstChild as Text;
		expect(selection?.anchorNode).toBe(contentText);
		expect(selection?.anchorOffset).toBe(contentText.length);
	});

	it('does not remove sole empty placeholder paragraph', () => {
		editor.setHTML('<p><br></p>');
		const paragraph = root.querySelector('p')!;
		setCursorAtBlockStart(editor, paragraph);

		dispatchBackspace(root);

		expect(editor.getHTML()).toBe('<p><br></p>');
	});

	it('removes empty list item on backspace at its start', () => {
		editor.setHTML('<ul><li>one</li><li><br></li></ul>');
		const items = root.querySelectorAll('li');
		setCursorAtBlockStart(editor, items[1]);

		dispatchBackspace(root);

		expect(root.querySelectorAll('li').length).toBe(1);
		expect(root.textContent).toBe('one');
	});

	it('outdents first list item with content to paragraph above list', () => {
		editor.setHTML('<ul><li>first</li><li>second</li></ul>');
		const firstItem = root.querySelector('li')!;
		setCursorAtBlockStart(editor, firstItem);

		dispatchBackspace(root);

		expect(root.querySelector('p')?.textContent).toBe('first');
		expect(root.querySelector('ul')?.querySelector('li')?.textContent).toBe('second');
	});

	it('moves cursor to previous root block from first blockquote paragraph', () => {
		editor.setHTML('<p>Before</p><blockquote><p>Quote</p></blockquote>');
		const quoteParagraph = root.querySelector('blockquote p')!;
		const beforeText = root.querySelector('p')!.firstChild as Text;
		setCursorAtBlockStart(editor, quoteParagraph);

		dispatchBackspace(root);

		expect(root.querySelector('blockquote')).not.toBeNull();
		const selection = editor.getSelection();
		expect(selection?.anchorNode).toBe(beforeText);
		expect(selection?.anchorOffset).toBe(beforeText.length);
	});

	it('does not intercept backspace inside readonly content', () => {
		editor.setHTML('<p data-readonly="true">Locked</p>');
		const readonlyParagraph = root.querySelector('p')!;
		setCursorAtBlockStart(editor, readonlyParagraph);

		const event = new InputEvent('beforeinput', {
			inputType: 'deleteContentBackward',
			bubbles: true,
			cancelable: true
		});
		const prevented = !root.dispatchEvent(event);

		expect(prevented).toBe(false);
	});
});
