import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

describe('HalkaSelection block boundaries', () => {
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

	it('reports not at block start in middle of text', () => {
		editor.setHTML('<p>hello</p>');
		const text = root.querySelector('p')!.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 2);
		range.collapse(true);
		editor.setSelection(range);

		expect(editor.selection.isAtBlockStart()).toBe(false);
		expect(editor.selection.isAtBlockEnd()).toBe(false);
	});

	it('reports at block start before inline formatting', () => {
		editor.setHTML('<p><strong>bold</strong> text</p>');
		const strong = root.querySelector('strong')!;
		const range = document.createRange();
		range.setStart(strong, 0);
		range.collapse(true);
		editor.setSelection(range);

		expect(editor.selection.isAtBlockStart()).toBe(true);
	});
});
