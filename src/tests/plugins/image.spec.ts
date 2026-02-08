import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { imagePlugin } from '../../lib/plugins/image.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

describe('imagePlugin', () => {
	it('inserts an image with default src at the current selection', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p>hello</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 5);
		range.setEnd(text, 5);
		editor.setSelection(range);

		editor.execCommand('image.insert');

		const img = root.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.getAttribute('src')).toBe('https://placehold.co/400x300?text=Image');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('inserts an image with provided attributes', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p>hello</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 5);
		range.setEnd(text, 5);
		editor.setSelection(range);

		editor.execCommand('image.insert', {
			src: 'https://example.com/image.png',
			alt: 'Example',
			title: 'Example title'
		});

		const img = root.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.getAttribute('src')).toBe('https://example.com/image.png');
		expect(img?.getAttribute('alt')).toBe('Example');
		expect(img?.getAttribute('title')).toBe('Example title');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('updates attributes of the image at the current selection', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p><img src="old.png" alt="Old" title="Old title">hello</p>');

		const img = root.querySelector('img') as HTMLImageElement | null;
		expect(img).not.toBeNull();

		if (!img) {
			throw new Error('image not found');
		}

		const range = document.createRange();
		range.selectNode(img);
		editor.setSelection(range);

		editor.execCommand('image.update', {
			src: 'https://example.com/new.png',
			alt: 'New alt',
			title: 'New title'
		});

		const updated = root.querySelector('img');
		expect(updated).not.toBeNull();
		expect(updated?.getAttribute('src')).toBe('https://example.com/new.png');
		expect(updated?.getAttribute('alt')).toBe('New alt');
		expect(updated?.getAttribute('title')).toBe('New title');

		document.body.removeChild(root);
		editor.destroy();
	});
});
