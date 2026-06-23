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

	it('toggles ordered list on current empty line when selection is at root boundary', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		editor.setHTML('<p>first</p><p><br></p>');

		const range = document.createRange();
		range.setStart(root, 1);
		range.collapse(true);
		editor.setSelection(range);

		editor.execCommand('list.toggleOrdered');

		const blocks = Array.from(root.children);
		expect(blocks[0].tagName).toBe('P');
		expect(blocks[1].tagName).toBe('OL');
		expect(blocks[1].querySelector('li')).not.toBeNull();
		expect(blocks[0].textContent).toBe('first');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('keeps caret in the new empty ordered list item (not previous line)', () => {
		const root = createRoot();
		document.body.appendChild(root);
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		editor.setHTML('<p>first</p><p><br></p>');

		const emptyP = root.children[1] as HTMLElement;
		const range = document.createRange();
		range.selectNodeContents(emptyP);
		range.collapse(true);
		editor.setSelection(range);

		editor.execCommand('list.toggleOrdered');

		const ol = root.querySelector('ol')!;
		const li = ol.querySelector('li')!;

		const caretRange = editor.getRange();
		let node: Node | null = caretRange.startContainer;
		let caretLi: HTMLElement | null = null;
		while (node && node !== root) {
			if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'LI') {
				caretLi = node as HTMLElement;
				break;
			}
			node = node.parentNode;
		}

		expect(caretRange.collapsed).toBe(true);
		expect(caretLi).toBe(li);
		expect(li.textContent?.trim()).toBe('');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('preserves caret text offset when toggling list on a non-empty paragraph', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		editor.setHTML('<p>hello world</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 5);
		range.collapse(true);
		editor.setSelection(range);

		editor.execCommand('list.toggleOrdered');

		const li = root.querySelector('ol > li')!;
		const liText = li.firstChild as Text;
		const caretRange = editor.getRange();

		expect(caretRange.collapsed).toBe(true);
		expect(caretRange.startContainer).toBe(liText);
		expect(caretRange.startOffset).toBe(5);

		document.body.removeChild(root);
		editor.destroy();
	});
});

