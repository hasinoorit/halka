import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { listPlugin } from '../../lib/plugins/list.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

describe('listPlugin', () => {
	it('registers without throwing', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		expect(editor).toBeTruthy();

		document.body.removeChild(root);
		editor.destroy();
	});

	it('returns list.active when caret is inside a list', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		editor.setHTML('<ul><li>one</li><li>two</li></ul>');
		const li = root.querySelector('li') as HTMLElement;
		const range = document.createRange();
		range.selectNodeContents(li);
		range.collapse(true);
		editor.setSelection(range);

		expect(editor.getState('list.active')).toEqual({ type: 'ul' });

		document.body.removeChild(root);
		editor.destroy();
	});

	it('returns ordered list type for list.active in OL', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		editor.setHTML('<ol><li>first</li></ol>');
		const li = root.querySelector('li') as HTMLElement;
		const range = document.createRange();
		range.selectNodeContents(li);
		range.collapse(true);
		editor.setSelection(range);

		expect(editor.getState('list.active')).toEqual({ type: 'ol' });

		document.body.removeChild(root);
		editor.destroy();
	});

	it('returns null for list.active outside a list', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		editor.setHTML('<p>plain text</p>');
		const p = root.querySelector('p') as HTMLElement;
		const range = document.createRange();
		range.selectNodeContents(p);
		range.collapse(true);
		editor.setSelection(range);

		expect(editor.getState('list.active')).toBeNull();

		document.body.removeChild(root);
		editor.destroy();
	});
});

