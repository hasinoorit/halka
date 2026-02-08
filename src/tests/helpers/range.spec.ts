import { describe, it, expect } from 'vitest';
import {
	getRange,
	isAllSelectedATextNode,
	isSelectedAnElement,
	isSelectedWholeContentAnElement,
	isWrappedWith,
	isWrappedWithClassName,
	splitText,
	unwrapWith
} from '../../lib/helpers/range.js';

const setSelection = (range: Range) => {
	const selection = window.getSelection();
	if (!selection) {
		throw new Error('selection is not available');
	}
	selection.removeAllRanges();
	selection.addRange(range);
};

describe('range helpers', () => {
	it('returns current range from selection', () => {
		const text = document.createTextNode('hello');
		const container = document.createElement('div');
		container.appendChild(text);
		document.body.appendChild(container);

		const range = document.createRange();
		range.setStart(text, 1);
		range.setEnd(text, 4);
		setSelection(range);

		const current = getRange();
		expect(current).toBeDefined();
		expect(current?.startOffset).toBe(1);
		expect(current?.endOffset).toBe(4);

		document.body.removeChild(container);
	});

	it('detects when full text node is selected', () => {
		const span = document.createElement('span');
		const text = document.createTextNode('lorem');
		span.appendChild(text);
		document.body.appendChild(span);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);

		const selectedTextNode = isAllSelectedATextNode(range);
		expect(selectedTextNode).toBe(text);

		document.body.removeChild(span);
	});

	it('returns parent element when its only text child is fully selected', () => {
		const span = document.createElement('span');
		const text = document.createTextNode('ipsum');
		span.appendChild(text);
		document.body.appendChild(span);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);

		const element = isSelectedAnElement(range);
		expect(element).toBe(span);

		document.body.removeChild(span);
	});

	it('detects when the whole content of an element is selected', () => {
		const span = document.createElement('span');
		const text = document.createTextNode('dolor sit amet');
		span.appendChild(text);
		document.body.appendChild(span);

		const range = document.createRange();
		range.selectNodeContents(span);
		setSelection(range);

		const selected = isSelectedWholeContentAnElement();
		expect(selected).toBe(span);

		document.body.removeChild(span);
	});

	it('checks wrapping by tag name', () => {
		const strong = document.createElement('strong');
		const text = document.createTextNode('hello');
		strong.appendChild(text);
		document.body.appendChild(strong);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		setSelection(range);

		const result = isWrappedWith('STRONG');
		expect(result).toBe(strong);

		document.body.removeChild(strong);
	});

	it('checks wrapping by class name', () => {
		const span = document.createElement('span');
		span.className = 'note';
		const text = document.createTextNode('marked');
		span.appendChild(text);
		document.body.appendChild(span);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		setSelection(range);

		const result = isWrappedWithClassName('note');
		expect(result).toBe(true);

		document.body.removeChild(span);
	});

	it('splits text at cursor position using current range', () => {
		const text = document.createTextNode('abcdef');
		const container = document.createElement('div');
		container.appendChild(text);
		document.body.appendChild(container);

		const range = document.createRange();
		range.setStart(text, 3);
		range.setEnd(text, 3);
		setSelection(range);

		const parts = splitText();
		expect(parts).toBeDefined();
		const [first, second] = parts ?? [];
		expect(first?.data).toBe('abc');
		expect(second?.data).toBe('def');

		document.body.removeChild(container);
	});

	it('unwraps the nearest matching ancestor element', () => {
		const container = document.createElement('div');
		container.contentEditable = 'true';

		const strong = document.createElement('strong');
		const text = document.createTextNode('wrapped');
		strong.appendChild(text);
		container.appendChild(strong);
		document.body.appendChild(container);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		setSelection(range);

		unwrapWith('STRONG');

		expect(container.textContent).toBe('wrapped');
		expect(container.firstChild).toBe(text);

		document.body.removeChild(container);
	});
});
