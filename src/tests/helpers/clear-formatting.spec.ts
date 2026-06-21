import { describe, it, expect, beforeEach } from 'vitest';
import { clearFormatting } from '../../lib/helpers/clear-formatting.js';
import { defaultSchema } from '../../lib/core/schema.js';

function selectNodeContents(element: HTMLElement): Range {
	const range = document.createRange();
	range.selectNodeContents(element);
	return range;
}

function setCollapsedRange(node: Node, offset: number): Range {
	const range = document.createRange();
	range.setStart(node, offset);
	range.collapse(true);
	return range;
}

describe('clearFormatting helper', () => {
	let root: HTMLElement;

	beforeEach(() => {
		root = document.createElement('div');
		document.body.appendChild(root);
	});

	const isBlock = (tagName: string) => defaultSchema.blocks.has(tagName.toUpperCase());

	it('clears formatting tags from the current block when the selection is collapsed', () => {
		root.innerHTML =
			'<p style="text-align: center"><strong style="color: red"><em>Hello</em></strong> world</p>';
		const paragraph = root.querySelector('p')!;
		const textNode = paragraph.querySelector('em')!.firstChild!;
		const range = setCollapsedRange(textNode, 2);

		clearFormatting({ root, range, isBlock });

		expect(root.innerHTML).toBe(
			'<p style="text-align: center">Hello world</p>'
		);
	});

	it('clears formatting only within a non-collapsed selection', () => {
		root.innerHTML =
			'<p><strong>one</strong> <strong>two</strong> <strong>three</strong></p>';
		const middle = root.querySelectorAll('strong')[1]!;
		const range = document.createRange();
		range.selectNodeContents(middle);

		clearFormatting({ root, range, isBlock });

		expect(root.innerHTML).toBe('<p><strong>one</strong> two <strong>three</strong></p>');
	});

	it('unwraps nested inline tags inside the selected range', () => {
		root.innerHTML = '<p><strong><em>formatted</em></strong></p>';
		const range = selectNodeContents(root.querySelector('p')!);

		clearFormatting({ root, range, isBlock });

		expect(root.innerHTML).toBe('<p>formatted</p>');
	});

	it('keeps inline style attributes on non-format elements', () => {
		root.innerHTML =
			'<p><strong><span style="color: blue">styled bold</span></strong></p>';
		const range = selectNodeContents(root.querySelector('p')!);

		clearFormatting({ root, range, isBlock });

		expect(root.innerHTML).toBe('<p><span style="color: blue">styled bold</span></p>');
	});

	it('skips readonly subtrees when clearing the current block', () => {
		root.innerHTML =
			'<p><strong>editable</strong> <span data-readonly="true"><strong>locked</strong></span></p>';
		const paragraph = root.querySelector('p')!;
		const range = setCollapsedRange(paragraph.firstChild!.firstChild!, 0);

		clearFormatting({ root, range, isBlock });

		expect(root.innerHTML).toBe(
			'<p>editable <span data-readonly="true"><strong>locked</strong></span></p>'
		);
	});
});
