import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { linkPlugin } from '../../lib/plugins/link.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

describe('linkPlugin', () => {
	it('wraps selected text in a link and toggles it off', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [linkPlugin] });

		editor.setHTML('<p>hello world</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 5);
		editor.setSelection(range);

		editor.execCommand('link.toggle', {
			href: 'https://example.com',
			target: '_blank',
			rel: 'noreferrer'
		});

		let a = root.querySelector('a');
		expect(a).not.toBeNull();
		expect(a?.getAttribute('href')).toBe('https://example.com');
		expect(a?.getAttribute('target')).toBe('_blank');
		expect(a?.getAttribute('rel')).toBe('noreferrer');
		expect(a?.textContent).toBe('hello');

		const newText = a?.firstChild as Text;
		const newRange = document.createRange();
		newRange.setStart(newText, 0);
		newRange.setEnd(newText, newText.textContent?.length ?? 0);
		editor.setSelection(newRange);

		editor.execCommand('link.toggle');

		a = root.querySelector('a');
		expect(a).toBeNull();
		expect(root.textContent).toBe('hello world');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('updates attributes of the link at the current selection', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [linkPlugin] });

		editor.setHTML(
			'<p><a href="https://old.example.com" target="_self" rel="noopener">hello</a> world</p>'
		);

		const a = root.querySelector('a') as HTMLAnchorElement | null;
		expect(a).not.toBeNull();

		if (!a) {
			throw new Error('link not found');
		}

		const text = a.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		editor.setSelection(range);

		editor.execCommand('link.update', {
			href: 'https://new.example.com',
			target: '_blank',
			rel: 'noreferrer'
		});

		const updated = root.querySelector('a');
		expect(updated).not.toBeNull();
		expect(updated?.getAttribute('href')).toBe('https://new.example.com');
		expect(updated?.getAttribute('target')).toBe('_blank');
		expect(updated?.getAttribute('rel')).toBe('noreferrer');
		expect(updated?.textContent).toBe('hello');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('unlinks the active link at the current selection', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [linkPlugin] });

		editor.setHTML('<p><a href="https://example.com">hello</a> world</p>');

		const a = root.querySelector('a') as HTMLAnchorElement | null;
		expect(a).not.toBeNull();

		if (!a) {
			throw new Error('link not found');
		}

		const text = a.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		editor.setSelection(range);

		editor.execCommand('link.unlink');

		const remainingLink = root.querySelector('a');
		expect(remainingLink).toBeNull();
		expect(root.textContent).toBe('hello world');

		document.body.removeChild(root);
		editor.destroy();
	});
});
