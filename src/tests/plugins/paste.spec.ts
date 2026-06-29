import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { imagePlugin } from '../../lib/plugins/image.js';
import { pastePlugin } from '../../lib/plugins/paste.js';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

const createPasteEvent = (html: string, text: string, files?: File[]) => {
	const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent & {
		clipboardData: DataTransfer;
	};
	const items: DataTransferItem[] = [];
	if (files?.length) {
		for (const file of files) {
			items.push({
				type: file.type,
				kind: 'file',
				getAsFile: () => file
			} as DataTransferItem);
		}
	}

	event.clipboardData = {
		getData: (type: string) => (type === 'text/html' ? html : text),
		files: files as unknown as FileList,
		items: items as unknown as DataTransferItemList
	} as DataTransfer;
	return event;
};

const selectAll = (root: HTMLElement, editor: HalkaEditor) => {
	const range = document.createRange();
	range.selectNodeContents(root);
	editor.setSelection(range);
};

describe('pastePlugin', () => {
	it('sanitizes pasted HTML and enforces block model', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		const dirtyHTML =
			'<div><script>alert(1)</script><b>Bold</b> and <i>Italic</i><section>Section content</section></div>';
		root.dispatchEvent(createPasteEvent(dirtyHTML, 'Bold and Italic Section content'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('alert(1)');
		expect(html).not.toContain('<section>');
		expect(html).toContain('<b>Bold</b>');
		expect(html).toContain('<i>Italic</i>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('wraps top-level text and inlines in paragraphs', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		root.dispatchEvent(createPasteEvent('Just some text <span>and a span</span>', 'Just some text and a span'));
		await flushPromises();

		expect(editor.getHTML()).toBe('<p>Just some text <span>and a span</span></p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('handles plain text by splitting into paragraphs', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		root.dispatchEvent(createPasteEvent('', 'Line 1\n\nLine 2'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('<p>Line 1</p>');
		expect(html).toContain('<p>Line 2</p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('removes empty paragraphs after sanitization', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		root.dispatchEvent(createPasteEvent('<p></p><p>Content</p><p>  </p>', 'Content'));
		await flushPromises();

		expect(editor.getHTML()).toBe('<p>Content</p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('converts pasted markdown plain text into HTML', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		const markdown = '# Heading\n\n**bold** and *italic*\n\n- item one\n- item two';
		root.dispatchEvent(createPasteEvent('', markdown));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('<h1>Heading</h1>');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<em>italic</em>');
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>item one</li>');
		expect(html).toContain('<li>item two</li>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('replaces empty block when pasting markdown with cursor inside it', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		const paragraph = root.querySelector('p')!;
		const range = document.createRange();
		range.setStart(paragraph, 0);
		range.collapse(true);
		editor.setSelection(range);

		root.dispatchEvent(createPasteEvent('', '# Heading\n\n**bold**'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toBe('<h1>Heading</h1><p><strong>bold</strong></p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('converts pasted horizontal rules', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		root.dispatchEvent(createPasteEvent('', 'Above\n\n---\n\nBelow'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('<hr>');
		expect(html).toContain('Above');
		expect(html).toContain('Below');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('preserves pasted HTML tables with structure and merged cells', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		const tableHtml = `
			<table>
				<caption>Quarterly results</caption>
				<thead><tr><th>Name</th><th>Score</th></tr></thead>
				<tbody>
					<tr><td colspan="2">Merged</td></tr>
					<tr><td>Ada</td><td rowspan="2">95</td></tr>
				</tbody>
			</table>
		`;
		root.dispatchEvent(createPasteEvent(tableHtml, ''));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('<table>');
		expect(html).toContain('<caption>Quarterly results</caption>');
		expect(html).toContain('<thead>');
		expect(html).toContain('<tbody>');
		expect(html).toContain('colspan="2"');
		expect(html).toContain('rowspan="2"');
		expect(html).toContain('<td>Ada</td>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('preserves remote images and strips data URLs without upload hook', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		const htmlInput =
			'<p>Photo</p><img src="https://example.com/photo.jpg" alt="Photo"><img src="data:image/png;base64,abc">';
		root.dispatchEvent(createPasteEvent(htmlInput, ''));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('src="https://example.com/photo.jpg"');
		expect(html).toContain('alt="Photo"');
		expect(html).not.toContain('data:image/png');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('maps del tags to strikethrough', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		root.dispatchEvent(createPasteEvent('<p><del>removed</del></p>', ''));
		await flushPromises();

		expect(editor.getHTML()).toContain('<s>removed</s>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('preserves trusted YouTube iframes with sandbox', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		const iframe =
			'<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>';
		root.dispatchEvent(createPasteEvent(iframe, ''));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('<iframe');
		expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ');
		expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('strips untrusted iframes', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		root.dispatchEvent(
			createPasteEvent('<iframe src="https://evil.example/embed"></iframe><p>Safe</p>', '')
		);
		await flushPromises();

		const html = editor.getHTML();
		expect(html).not.toContain('<iframe');
		expect(html).toContain('Safe');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('uploads clipboard image files through onImageUpload', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, {
			shortcuts: false,
			plugins: [
				imagePlugin,
				pastePlugin({
					onImageUpload: async () => 'https://cdn.example/uploaded.png'
				})
			]
		});

		editor.setHTML('');
		selectAll(root, editor);

		const file = new File(['image-bytes'], 'shot.png', { type: 'image/png' });
		root.dispatchEvent(createPasteEvent('', '', [file]));
		await flushPromises();

		expect(editor.getHTML()).toContain('src="https://cdn.example/uploaded.png"');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('uploads data URL images in HTML through onImageUpload', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, {
			shortcuts: false,
			plugins: [
				imagePlugin,
				pastePlugin({
					onImageUpload: async () => 'https://cdn.example/from-data.png'
				})
			]
		});

		editor.setHTML('');
		selectAll(root, editor);

		const dataUrl =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
		root.dispatchEvent(createPasteEvent(`<img src="${dataUrl}" alt="pixel">`, ''));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('src="https://cdn.example/from-data.png"');
		expect(html).not.toContain('data:image/png');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('replaces a selected image when pasting text', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('<p><img src="https://example.com/photo.jpg" alt="Photo"></p>');

		const img = root.querySelector('img')!;
		const range = document.createRange();
		range.selectNode(img);
		editor.setSelection(range);

		root.dispatchEvent(createPasteEvent('', 'Pasted text'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('Pasted text');
		expect(html).not.toContain('src="https://example.com/photo.jpg"');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('replaces inline image at the start of a mixed selection when pasting', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML(
			'<p>Before <img src="https://example.com/inline.jpg" alt="Inline"> After</p>'
		);

		const img = root.querySelector('img')!;
		const textNode = img.nextSibling as Text;
		const range = document.createRange();
		range.setStart(img, 0);
		range.setEnd(textNode, textNode.length);
		editor.setSelection(range);

		root.dispatchEvent(createPasteEvent('', 'Pasted'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('Pasted');
		expect(html).toContain('Before');
		expect(html).not.toContain('src="https://example.com/inline.jpg"');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('replaces image-first selection with pasted content', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML(
			'<p><img src="https://example.com/photo.jpg" alt="Photo"></p><p>Hello world</p>'
		);

		const img = root.querySelector('img')!;
		const textNode = root.querySelector('p:last-child')!.firstChild as Text;
		const range = document.createRange();
		range.setStart(img, 0);
		range.setEnd(textNode, 5);
		editor.setSelection(range);

		root.dispatchEvent(createPasteEvent('', 'Pasted text'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('Pasted text');
		expect(html).not.toContain('src="https://example.com/photo.jpg"');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('preserves an image before the selection when pasting at a collapsed cursor', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('<p><img src="https://example.com/keep.jpg" alt="Keep"></p><p>Hello</p>');

		const hello = root.querySelector('p:last-child')!.firstChild as Text;
		const range = document.createRange();
		range.setStart(hello, 0);
		range.collapse(true);
		editor.setSelection(range);

		root.dispatchEvent(createPasteEvent('', 'Pasted'));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('src="https://example.com/keep.jpg"');
		expect(html).toContain('Pasted');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('preserves footnote data attributes on paste', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });

		editor.setHTML('');
		selectAll(root, editor);

		const footnoteHtml = `
			<p>Text<sup data-footnote-citation="fn-1"><a href="#fn-1">[1]</a></sup></p>
			<ol data-footnote-list="true">
				<li id="fn-1" data-footnote-item-id="fn-1">Footnote body</li>
			</ol>
		`;
		root.dispatchEvent(createPasteEvent(footnoteHtml, ''));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('data-footnote-citation="fn-1"');
		expect(html).toContain('data-footnote-list="true"');
		expect(html).toContain('data-footnote-item-id="fn-1"');

		document.body.removeChild(root);
		editor.destroy();
	});
});
