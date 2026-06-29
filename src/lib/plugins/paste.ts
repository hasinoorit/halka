import { type Editor, definePlugin, type HalkaPlugin } from '../core/editor.js';
import { markdownToHtml } from '../helpers/markdown.js';
import {
	getClipboardImageFile,
	processPastedHTML,
	type PasteSanitizeOptions
} from '../helpers/paste-sanitize.js';

export type PastePluginOptions = PasteSanitizeOptions;

const isSimplePlainText = (text: string): boolean => !/[\r\n]/.test(text);

const handlePaste = (editor: Editor, event: Event, options: PasteSanitizeOptions): void => {
	const clipboardEvent = event as ClipboardEvent;
	const clipboardData = clipboardEvent.clipboardData;
	if (!clipboardData) return;

	const imageFile = getClipboardImageFile(clipboardData);
	if (imageFile && options.onImageUpload) {
		clipboardEvent.preventDefault();
		void options.onImageUpload(imageFile).then((url) => {
			editor.execCommand('image.insert', { src: url, layout: 'block' });
		});
		return;
	}

	clipboardEvent.preventDefault();

	const html = clipboardData.getData('text/html');
	const text = clipboardData.getData('text/plain');
	const savedRange = editor.getRange().cloneRange();
	const insertOptions = { range: savedRange, history: 'group' as const };

	const insertContent = async () => {
		let content = '';

		if (editor.inline) {
			if (html) {
				content = await processPastedHTML(html, editor, options);
				editor.insertHTML(content, insertOptions);
				return;
			}
			if (text) {
				editor.insertText(text.replace(/[\r\n]+/g, ' '), insertOptions);
				return;
			}
		} else if (html) {
			content = await processPastedHTML(html, editor, options);
		} else if (text) {
			if (isSimplePlainText(text)) {
				editor.insertText(text, insertOptions);
				return;
			}
			content = await processPastedHTML(markdownToHtml(text), editor, options);
		}

		if (content) {
			editor.insertHTML(content, insertOptions);
		}
	};

	void insertContent();
};

export const pastePlugin = (options: PastePluginOptions = {}): HalkaPlugin =>
	definePlugin({
		name: 'paste',
		events: {
			paste: (editor, event) => handlePaste(editor, event, options)
		}
	});
