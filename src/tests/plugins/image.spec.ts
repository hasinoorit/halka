import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { imagePlugin, inferImageLayout } from '../../lib/plugins/image.js';

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
		expect((img as HTMLImageElement).style.display).toBe('inline');
		expect(inferImageLayout(img as HTMLImageElement, root)).toBe('inline');

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

	it('returns image.active when an image is selected', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p><img src="photo.png" alt="Photo" title="Title">hello</p>');
		const img = root.querySelector('img') as HTMLImageElement;

		const range = document.createRange();
		range.selectNode(img);
		editor.setSelection(range);
		document.dispatchEvent(new Event('selectionchange'));

		const active = editor.getState('image.active') as {
			src: string;
			alt: string;
			title: string;
			layout: string;
		} | null;

		expect(active).toEqual({
			src: 'photo.png',
			alt: 'Photo',
			title: 'Title',
			layout: 'inline',
			style: {
				display: '',
				width: '',
				height: '',
				maxWidth: ''
			}
		});

		document.body.removeChild(root);
		editor.destroy();
	});

	it('returns null for image.active when caret is in text', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p><img src="photo.png" alt="Photo">hello</p>');
		const p = root.querySelector('p') as HTMLElement;
		const text = p.lastChild as Text;

		const range = document.createRange();
		range.setStart(text, 2);
		range.collapse(true);
		editor.setSelection(range);
		document.dispatchEvent(new Event('selectionchange'));

		expect(editor.getState('image.active')).toBeNull();

		document.body.removeChild(root);
		editor.destroy();
	});

	it('selects image on mousedown and applies highlight class', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p><img src="photo.png" alt="Photo">hello</p>');
		const img = root.querySelector('img') as HTMLImageElement;

		img.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		document.dispatchEvent(new Event('selectionchange'));

		expect(editor.getState('image.active')).not.toBeNull();
		expect(img.classList.contains('halka-selected-image')).toBe(true);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('removes highlight when selection moves to text', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p><img src="photo.png" alt="Photo">hello</p>');
		const img = root.querySelector('img') as HTMLImageElement;
		const p = root.querySelector('p') as HTMLElement;
		const text = p.lastChild as Text;

		img.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		document.dispatchEvent(new Event('selectionchange'));
		expect(img.classList.contains('halka-selected-image')).toBe(true);

		const range = document.createRange();
		range.setStart(text, 2);
		range.collapse(true);
		editor.setSelection(range);
		document.dispatchEvent(new Event('selectionchange'));

		expect(img.classList.contains('halka-selected-image')).toBe(false);
		expect(editor.getState('image.active')).toBeNull();

		document.body.removeChild(root);
		editor.destroy();
	});

	it('inserts an image with inline layout styles', () => {
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
			layout: 'inline',
			style: {
				width: '120px',
				height: '80px',
				maxWidth: '100%'
			}
		});

		const img = root.querySelector('img') as HTMLImageElement;
		expect(img.style.display).toBe('inline');
		expect(img.style.width).toBe('120px');
		expect(img.style.height).toBe('80px');
		expect(img.style.maxWidth).toBe('100%');
		expect(inferImageLayout(img, root)).toBe('inline');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('inserts a block image at the end of a paragraph', () => {
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
			src: 'https://example.com/block.png',
			layout: 'block'
		});

		const paragraphs = root.querySelectorAll('p');
		expect(paragraphs.length).toBe(2);
		expect(paragraphs[0].textContent).toBe('hello');
		expect(paragraphs[1].querySelector('img')).not.toBeNull();
		expect(inferImageLayout(paragraphs[1].querySelector('img') as HTMLImageElement, root)).toBe(
			'block'
		);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('inserts a block image mid-paragraph by splitting the block', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p>helloworld</p>');
		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 5);
		range.setEnd(text, 5);
		editor.setSelection(range);

		editor.execCommand('image.insert', {
			src: 'https://example.com/block.png',
			layout: 'block'
		});

		const paragraphs = root.querySelectorAll('p');
		expect(paragraphs.length).toBe(3);
		expect(paragraphs[0].textContent).toBe('hello');
		expect(paragraphs[1].querySelector('img')).not.toBeNull();
		expect(paragraphs[2].textContent).toBe('world');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('reports block layout for image.active on dedicated image paragraphs', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p><img src="photo.png" alt="Photo"></p>');
		const img = root.querySelector('img') as HTMLImageElement;

		const range = document.createRange();
		range.selectNode(img);
		editor.setSelection(range);

		const active = editor.getState('image.active') as { layout: string } | null;
		expect(active?.layout).toBe('block');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('updates and clears image layout styles', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML(
			'<p><img src="photo.png" style="display:block;width:200px;height:100px;max-width:50%"></p>'
		);
		const img = root.querySelector('img') as HTMLImageElement;

		const range = document.createRange();
		range.selectNode(img);
		editor.setSelection(range);

		editor.execCommand('image.update', {
			layout: 'block',
			style: {
				width: '300px',
				height: '',
				maxWidth: ''
			}
		});

		expect(img.style.width).toBe('300px');
		expect(img.style.height).toBe('');
		expect(img.style.maxWidth).toBe('');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('promotes an inline image to block layout on update', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p>hello <img src="photo.png" alt="Photo"> world</p>');
		const img = root.querySelector('img') as HTMLImageElement;

		const range = document.createRange();
		range.selectNode(img);
		editor.setSelection(range);

		editor.execCommand('image.update', { layout: 'block' });

		const paragraphs = root.querySelectorAll('p');
		expect(paragraphs.length).toBe(3);
		expect(paragraphs[0].textContent).toBe('hello ');
		expect(paragraphs[1].querySelector('img')).toBe(img);
		expect(paragraphs[2].textContent).toBe(' world');
		expect(inferImageLayout(img, root)).toBe('block');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('demotes a block image to inline layout on update', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p>hello</p><p><img src="photo.png" alt="Photo"></p><p>world</p>');
		const img = root.querySelector('img') as HTMLImageElement;

		const range = document.createRange();
		range.selectNode(img);
		editor.setSelection(range);

		editor.execCommand('image.update', { layout: 'inline' });

		const paragraphs = root.querySelectorAll('p');
		expect(paragraphs.length).toBe(2);
		expect(paragraphs[0].textContent).toBe('hello');
		expect(paragraphs[0].querySelector('img')).toBe(img);
		expect(img.style.display).toBe('inline');
		expect(paragraphs[1].textContent).toBe('world');
		expect(inferImageLayout(img, root)).toBe('inline');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('updates image after click-select via image.update', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [imagePlugin] });

		editor.setHTML('<p><img src="old.png" alt="Old">hello</p>');
		const img = root.querySelector('img') as HTMLImageElement;

		img.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		document.dispatchEvent(new Event('selectionchange'));

		editor.execCommand('image.update', {
			src: 'https://example.com/new.png',
			alt: 'Updated'
		});

		expect(img.getAttribute('src')).toBe('https://example.com/new.png');
		expect(img.getAttribute('alt')).toBe('Updated');

		document.body.removeChild(root);
		editor.destroy();
	});
});
