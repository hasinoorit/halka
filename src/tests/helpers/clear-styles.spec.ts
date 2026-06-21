import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';

describe('editor.clearStyles', () => {
	let root: HTMLElement;
	let editor: HalkaEditor;

	beforeEach(() => {
		root = document.createElement('div');
		document.body.appendChild(root);
		editor = new HalkaEditor(root, { shortcuts: false });
	});

	afterEach(() => {
		editor.destroy();
		document.body.removeChild(root);
	});

	it('clears style attributes from the current block when the selection is collapsed', () => {
		editor.setHTML(
			'<p style="text-align: center"><strong style="color: red"><em>Hello</em></strong> world</p>'
		);
		const textNode = root.querySelector('em')!.firstChild!;
		const range = document.createRange();
		range.setStart(textNode, 2);
		range.collapse(true);
		editor.setSelection(range);

		editor.clearStyles();

		expect(root.innerHTML).toBe(
			'<p><strong><em>Hello</em></strong> world</p>'
		);
	});

	it('clears styles within the selection root for a non-collapsed selection', () => {
		editor.setHTML(
			'<p><strong>one</strong> <strong style="color: red">two</strong> <strong>three</strong></p>'
		);
		const middle = root.querySelectorAll('strong')[1]!;
		const range = document.createRange();
		range.selectNodeContents(middle);
		editor.setSelection(range);

		editor.clearStyles();

		expect(root.innerHTML).toBe(
			'<p><strong>one</strong> <strong>two</strong> <strong>three</strong></p>'
		);
	});

	it('unwraps spans left without a style attribute during normalization', () => {
		editor.setHTML(
			'<p>plain <span style="color: blue; font-size: 20px">styled</span> text</p>'
		);
		const paragraph = root.querySelector('p')!;
		const range = document.createRange();
		range.selectNodeContents(paragraph);
		editor.setSelection(range);

		editor.clearStyles();

		expect(root.innerHTML).toBe('<p>plain styled text</p>');
	});

	it('does not remove semantic formatting tags', () => {
		editor.setHTML('<p><strong><em style="color: blue">formatted</em></strong></p>');
		const paragraph = root.querySelector('p')!;
		const range = document.createRange();
		range.selectNodeContents(paragraph);
		editor.setSelection(range);

		editor.clearStyles();

		expect(root.innerHTML).toBe('<p><strong><em>formatted</em></strong></p>');
	});

	it('skips readonly subtrees when clearing the current block', () => {
		editor.setHTML(
			'<p style="color: red"><strong>editable</strong> <span data-readonly="true" style="color: blue"><strong>locked</strong></span></p>'
		);
		const textNode = root.querySelector('p strong')!.firstChild!;
		const range = document.createRange();
		range.setStart(textNode, 0);
		range.collapse(true);
		editor.setSelection(range);

		editor.clearStyles();

		expect(root.innerHTML).toBe(
			'<p><strong>editable</strong> <span data-readonly="true" style="color: blue"><strong>locked</strong></span></p>'
		);
	});
});
