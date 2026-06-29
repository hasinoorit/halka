import { describe, it, expect, beforeEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { footnotePlugin, type FootnoteItem } from '../../lib/plugins/footnote.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

const expectCitationStructure = (sup: HTMLElement, footnoteId: string, number: number) => {
	expect(sup.id).toMatch(/^citation-fn-/);
	expect(sup.getAttribute('contenteditable')).toBe('false');
	expect(sup.getAttribute('data-footnote-citation')).toBe(footnoteId);
	expect(sup.querySelector(':scope > span')).toBeNull();

	const link = sup.querySelector(':scope > a');
	expect(link?.getAttribute('href')).toBe(`#${footnoteId}`);
	expect(link?.textContent).toBe(`[${number}]`);
	expect(link?.hasAttribute('style')).toBe(false);
};

describe('footnotePlugin', () => {
	let root: HTMLElement;
	let editor: HalkaEditor;
	let cleanup: () => void;

	beforeEach(() => {
		root = createRoot();
		editor = new HalkaEditor(root, { shortcuts: false, plugins: [footnotePlugin] });
		editor.setHTML('<p><br></p>');
		cleanup = () => {
			document.body.removeChild(root);
			editor.destroy();
		};
		return cleanup;
	});

	it('adds a footnote item and gets it back', () => {
		editor.execCommand('footnote.addItem', 'Footnote 1 content');
		const items = editor.getState('footnote.items') as FootnoteItem[];
		expect(items.length).toBe(1);
		expect(items[0].content).toBe('Footnote 1 content');

		const list = root.querySelector('ol[data-footnote-list]');
		expect(list?.getAttribute('contenteditable')).toBe('false');
		expect(list?.getAttribute('data-protected')).toBe('true');
	});

	it('inserts a minimal citation without inline styles or wrapper spans', () => {
		editor.setHTML('<p>Text here</p>');
		editor.execCommand('footnote.addItem', 'Footnote 1');

		const items = editor.getState('footnote.items') as FootnoteItem[];
		const fnId = items[0].id;

		const p = root.querySelector('p')!;
		const textNode = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(textNode, 4);
		range.collapse(true);
		editor.setSelection(range);

		editor.execCommand('footnote.insertCitation', fnId);

		const sup = root.querySelector('sup') as HTMLElement;
		expect(sup).not.toBeNull();
		expectCitationStructure(sup, fnId, 1);

		const li = root.querySelector('li') as HTMLLIElement;
		expect(li.id).toBe(fnId);
		expect(li.hasAttribute('data-footnote-item-id')).toBe(false);

		const backlink = li.querySelector('[data-footnote-backlinks] a');
		expect(backlink?.getAttribute('href')).toBe(`#${sup.id}`);
		expect(backlink?.textContent).toBe(' [\u21e7]');
		expect(backlink?.hasAttribute('style')).toBe(false);
	});

	it('normalizes imported footnote HTML into the minimal structure', () => {
		editor.setHTML(`
			<p>Hello <sup data-footnote-citation="fn-imported"><span><a href="#fn-imported" style="color: red;">[1]</a></span></sup></p>
			<ol data-footnote-list>
				<li id="fn-imported" data-footnote-item-id="fn-imported">Goblin note</li>
			</ol>
		`);

		editor.execCommand('footnote.normalize');

		const sup = root.querySelector('sup') as HTMLElement;
		expectCitationStructure(sup, 'fn-imported', 1);

		const li = root.querySelector('li') as HTMLLIElement;
		expect(li.hasAttribute('data-footnote-item-id')).toBe(false);

		const backlink = root.querySelector('[data-footnote-backlinks] a');
		expect(backlink?.getAttribute('href')).toBe(`#${sup.id}`);
	});

	it('cleans up citations when a footnote is removed', () => {
		editor.setHTML('<p>Cite</p>');
		editor.execCommand('footnote.addItem', 'To be removed');

		const items = editor.getState('footnote.items') as FootnoteItem[];
		const id = items[0].id;

		const p = root.querySelector('p')!;
		const range = document.createRange();
		range.selectNodeContents(p.firstChild!);
		range.collapse(false);
		editor.setSelection(range);
		editor.execCommand('footnote.insertCitation', id);

		expect(root.querySelectorAll('sup').length).toBe(1);

		editor.execCommand('footnote.removeItem', id);
		expect(root.querySelectorAll('sup').length).toBe(0);
	});

	it('edits a footnote item while preserving backlinks', () => {
		editor.setHTML('<p>Text</p>');
		editor.execCommand('footnote.addItem', 'Old');

		const itemsBefore = editor.getState('footnote.items') as FootnoteItem[];
		const id = itemsBefore[0].id;

		const p = root.querySelector('p')!;
		const range = document.createRange();
		range.selectNodeContents(p.firstChild!);
		range.collapse(false);
		editor.setSelection(range);
		editor.execCommand('footnote.insertCitation', id);

		editor.execCommand('footnote.editItem', { id, content: 'New' });

		const itemsAfter = editor.getState('footnote.items') as FootnoteItem[];
		expect(itemsAfter[0].content).toBe('New');

		const li = root.querySelector('li');
		expect(li?.querySelector('[data-footnote-backlinks]')).not.toBeNull();
	});
});
