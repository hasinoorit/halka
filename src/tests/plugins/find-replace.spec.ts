import { describe, it, expect } from 'vitest';
import {
	collectEditableText,
	findMatchIndexAtOrAfter,
	findNextMatchIndex,
	findPreviousMatchIndex,
	findTextMatches
} from '../../lib/helpers/text-search.js';
import { HalkaEditor } from '../../lib/core/editor.js';
import { findReplacePlugin } from '../../lib/plugins/find-replace.js';
import { Range as RangeHelpers } from '../../lib/helpers/index.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

describe('text-search helpers', () => {
	it('collects editable text from the editor root', () => {
		const root = document.createElement('div');
		root.innerHTML = '<p>Hello <strong>world</strong></p>';
		expect(collectEditableText(root)).toBe('Hello world');
	});

	it('finds case-insensitive matches by default', () => {
		const matches = findTextMatches('Hello hello HELLO', 'hello');
		expect(matches).toEqual([
			{ start: 0, end: 5 },
			{ start: 6, end: 11 },
			{ start: 12, end: 17 }
		]);
	});

	it('supports whole word matching', () => {
		const matches = findTextMatches('the other there', 'the', { wholeWord: true });
		expect(matches).toEqual([{ start: 0, end: 3 }]);
	});
});

describe('findReplacePlugin', () => {
	it('selects the first match on the first findNext when none is active', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [findReplacePlugin] });

		editor.setHTML('<p>foo bar foo</p>');
		editor.execCommand('findReplace.setOptions', { query: 'foo' });

		expect(editor.getState('findReplace.state')?.currentIndex).toBe(-1);

		editor.execCommand('findReplace.findNext');
		expect(editor.getState('findReplace.state')?.currentIndex).toBe(0);

		editor.execCommand('findReplace.findNext');
		expect(editor.getState('findReplace.state')?.currentIndex).toBe(1);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('finds and selects the next match', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [findReplacePlugin] });

		editor.setHTML('<p>foo bar foo</p>');
		editor.execCommand('findReplace.setOptions', { query: 'foo' });
		editor.execCommand('findReplace.find');

		const state = editor.getState('findReplace.state');
		expect(state?.matchCount).toBe(2);
		expect(state?.currentIndex).toBe(0);
		expect(root.textContent).toContain('foo');

		editor.execCommand('findReplace.findNext');
		expect(editor.getState('findReplace.state')?.currentIndex).toBe(1);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('moves to the previous match with wrap-around', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [findReplacePlugin] });

		editor.setHTML('<p>alpha beta alpha</p>');
		editor.execCommand('findReplace.setOptions', { query: 'alpha' });
		editor.execCommand('findReplace.find');
		editor.execCommand('findReplace.findPrevious');

		expect(editor.getState('findReplace.state')?.currentIndex).toBe(1);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('replaces the current match and keeps searching', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [findReplacePlugin] });

		editor.setHTML('<p>cat cat</p>');
		editor.execCommand('findReplace.setOptions', { query: 'cat', replacement: 'dog' });
		editor.execCommand('findReplace.find');
		editor.execCommand('findReplace.replace');

		expect(root.textContent).toBe('dog cat');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('replaces all matches', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [findReplacePlugin] });

		editor.setHTML('<p>one two one</p>');
		editor.execCommand('findReplace.setOptions', { query: 'one', replacement: '1' });
		editor.execCommand('findReplace.replaceAll');

		expect(root.textContent).toBe('1 two 1');
		expect(editor.getState('findReplace.state')?.matchCount).toBe(0);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('highlights all matches without moving selection when query changes', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [findReplacePlugin] });

		editor.setHTML('<p>foo bar foo baz</p>');
		const selection = editor.getSelection();
		if (!selection) throw new Error('expected selection');

		RangeHelpers.restoreSelectionByOffsets(selection, root, 4, 4);
		const before = editor.getSelectionOffsets();

		editor.execCommand('findReplace.setOptions', { query: 'foo' });

		const after = editor.getSelectionOffsets();
		expect(after).toEqual(before);
		expect(editor.getState('findReplace.state')?.matchCount).toBe(2);
		expect(editor.getState('findReplace.state')?.currentIndex).toBe(-1);

		document.body.removeChild(root);
		editor.destroy();
	});
});
