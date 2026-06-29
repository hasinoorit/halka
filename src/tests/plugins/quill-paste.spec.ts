import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { pastePlugin } from '../../lib/plugins/paste.js';
import { processPastedHTML } from '../../lib/helpers/paste-sanitize.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const createPasteEvent = (html: string, text: string) => {
	const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent & {
		clipboardData: DataTransfer;
	};
	event.clipboardData = {
		getData: (type: string) => (type === 'text/html' ? html : text),
		files: [] as unknown as FileList,
		items: [] as unknown as DataTransferItemList
	} as DataTransfer;
	return event;
};

const QUILL_HTML_ONE_ROW = `
<h1><strong style="color: rgb(9, 9, 11);"><img src="https://islamicauthors.com/media/2/Gemini_Generated_Image_hvvemdhvvemdhvve.webp"></strong></h1>
<h1><strong style="color: rgb(9, 9, 11);">সারসংক্ষেপ:</strong></h1>
<table><tbody><tr>
<td data-row="1"><strong><u>মূল বক্তব্য:</u> </strong><span>Cell one content</span></td>
<td data-row="1"><strong><u>মূল প্রমাণ:</u> </strong><span>Cell two content</span></td>
<td data-row="1"><strong><u>মূল উপসংহার: </u></strong><span>Cell three content</span></td>
</tr></tbody></table>
<h1><br></h1>
`;

const QUILL_HTML_MULTI_ROW = `
<h1><strong><img src="https://islamicauthors.com/media/2/Gemini_Generated_Image_hvvemdhvvemdhvve.webp"></strong></h1>
<h1><strong>সারসংক্ষেপ:</strong></h1>
<table><tbody>
<tr><td data-row="1"><strong><u>মূল বক্তব্য:</u> </strong><span>Cell one content</span></td></tr>
<tr><td data-row="1"><strong><u>মূল প্রমাণ:</u> </strong><span>Cell two content</span></td></tr>
<tr><td data-row="1"><strong><u>মূল উপসংহার: </u></strong><span>Cell three content</span></td></tr>
</tbody></table>
`;

describe('Quill paste fidelity', () => {
	it('processPastedHTML preserves image and three table columns (single tr)', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		const html = await processPastedHTML(QUILL_HTML_ONE_ROW, editor);
		expect(html).toContain('Gemini_Generated_Image');
		expect(html).toContain('Cell one content');
		expect(html).toContain('Cell two content');
		expect(html).toContain('Cell three content');
		const tdCount = (html.match(/<td/g) ?? []).length;
		expect(tdCount).toBe(3);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('processPastedHTML preserves image and three table columns (quill multi-tr)', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		const html = await processPastedHTML(QUILL_HTML_MULTI_ROW, editor);
		expect(html).toContain('Gemini_Generated_Image');
		const tdCount = (html.match(/<td/g) ?? []).length;
		expect(tdCount).toBe(3);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('paste into editor preserves quill structure (multi-tr)', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });
		editor.setHTML('<p><br></p>');

		root.dispatchEvent(createPasteEvent(QUILL_HTML_MULTI_ROW, ''));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('Gemini_Generated_Image');
		expect(html).toContain('সারসংক্ষেপ:');
		expect(html).toContain('Cell one content');
		expect(html).toContain('Cell two content');
		expect(html).toContain('Cell three content');
		const tdCount = (html.match(/<td/g) ?? []).length;
		expect(tdCount).toBe(3);
		// Quill multi-tr rows should merge into one table row
		expect((html.match(/<tr/g) ?? []).length).toBe(1);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('paste into editor preserves quill structure (single tr)', async () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin()] });
		editor.setHTML('<p><br></p>');

		root.dispatchEvent(createPasteEvent(QUILL_HTML_ONE_ROW, ''));
		await flushPromises();

		const html = editor.getHTML();
		expect(html).toContain('Gemini_Generated_Image');
		expect(html).toContain('সারসংক্ষেপ:');
		const tdCount = (html.match(/<td/g) ?? []).length;
		expect(tdCount).toBe(3);

		document.body.removeChild(root);
		editor.destroy();
	});
});
