import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';

describe('Phase 3: Selection Stability', () => {
	let editor: HalkaEditor;
	let root: HTMLElement;

	beforeEach(() => {
		root = document.createElement('div');
		document.body.appendChild(root);
		editor = new HalkaEditor(root);
		editor.setHTML('<p>Test Content</p>');
		root.focus();
		// Setup initial selection on "Test"
		const p = root.querySelector('p')!;
		const text = p.firstChild!;
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 4);
		editor.setSelection(range);
	});

	afterEach(() => {
		editor.destroy();
		root.remove();
	});

	it('should create and restore markers', () => {
		const markers = editor.selection.createMarkers();
		expect(markers).not.toBeNull();
		if (!markers) return;

		// Check markers in DOM (hidden spans)
		const start = root.querySelector(`[data-halka-selection-start]`);
		const end = root.querySelector(`[data-halka-selection-end]`);
		expect(start).not.toBeNull();
		expect(end).not.toBeNull();
		expect(start?.id).toBe(markers.startId);
		expect(end?.id).toBe(markers.endId);

		editor.selection.restoreMarkers(markers);

		// Markers should be removed
		expect(root.querySelector(`[data-halka-selection-start]`)).toBeNull();

		// Selection should be restored
		const range = editor.getRange();
		expect(range.toString()).toBe('Test');
		expect(range.startOffset).toBe(0);
		expect(range.endOffset).toBe(4);
	});

	it('should preserve selection with callback', () => {
		editor.selection.preserveSelection(() => {
			// Modify DOM around selection but keep marker positions valid (text nodes still exist or markers move with them)
			const p = root.querySelector('p')!;
			p.setAttribute('data-modified', 'true');
		});

		const range = editor.getRange();
		expect(range.toString()).toBe('Test');
		expect(root.querySelector('p')?.getAttribute('data-modified')).toBe('true');
	});

	it('should register and run normalizers', () => {
		let ran = false;
		editor.registerNormalizer(() => {
			ran = true;
			return null; // No change
		});

		// Trigger normalization via applySelection (triggered by setSelection or any transaction)
		const range = document.createRange();
		const p = root.querySelector('p')!;
		range.selectNodeContents(p);
		editor.setSelection(range);

		expect(ran).toBe(true);
	});

	it('should update selection if normalizer returns new range', () => {
		editor.registerNormalizer((range) => {
			if (range.collapsed === false && range.toString() === 'Test Content') {
				const newRange = range.cloneRange();
				newRange.collapse(true);
				return newRange;
			}
			return null;
		});

		const range = document.createRange();
		const p = root.querySelector('p')!;
		range.selectNodeContents(p);
		editor.setSelection(range);

		const current = editor.getRange();
		expect(current.collapsed).toBe(true);
		expect(current.startOffset).toBe(0);
	});

	it('should normalize selection inside list containers', () => {
		editor.setHTML('<ul><li>Item</li></ul>');
		const ul = root.querySelector('ul')!;
		const range = document.createRange();
		range.selectNodeContents(ul);
		editor.setSelection(range);

		const current = editor.getRange();
		const li = root.querySelector('li')!;

		expect(current.collapsed).toBe(true);
		expect(current.startContainer).toBe(li);
		expect(current.startOffset).toBe(0);
	});

	it('should normalize selection to list item at container offset', () => {
		editor.setHTML('<ul><li>First</li><li>Second</li></ul>');
		const ul = root.querySelector('ul')!;
		const range = document.createRange();
		range.setStart(ul, 1);
		range.collapse(true);
		editor.setSelection(range);

		const current = editor.getRange();
		const items = root.querySelectorAll('li');

		expect(current.collapsed).toBe(true);
		expect(current.startContainer).toBe(items[1]);
		expect(current.startOffset).toBe(0);
	});

	it('should normalize selection correctly with whitespace text nodes in list', () => {
		editor.setHTML('<ul>\n<li>First</li>\n<li>Second</li>\n</ul>');
		const ul = root.querySelector('ul')!;
		const range = document.createRange();
		// childNodes: " ", li(First), " ", li(Second), " "
		range.setStart(ul, 2);
		range.collapse(true);
		editor.setSelection(range);

		const current = editor.getRange();
		const items = root.querySelectorAll('li');

		expect(current.collapsed).toBe(true);
		expect(current.startContainer).toBe(items[1]);
		expect(current.startOffset).toBe(0);
	});
});
