import { Node as NodeHelpers, isElementNode } from '../helpers/index.js';
import { type Editor, definePlugin } from '../core/editor.js';

type ImageCommandPayload = {
	src?: string;
	alt?: string;
	title?: string;
};

const getActiveImageElement = (editor: Editor): HTMLImageElement | null => {
	const range = editor.getRange();
	const root = editor.root;

	let node: Node | null = range.commonAncestorContainer;

	if (isElementNode(node) || (node && node.nodeType === 11)) {
		const start = Math.max(0, range.startOffset);
		const end = Math.min(node.childNodes.length, Math.max(start, range.endOffset));

		for (let i = start; i < end; i += 1) {
			const child = node.childNodes[i];
			if (isElementNode(child) && child.tagName === 'IMG') {
				return child as HTMLImageElement;
			}
		}
	}

	while (node && node !== root) {
		if (isElementNode(node) && node.tagName === 'IMG') {
			return node as HTMLImageElement;
		}
		node = node.parentElement;
	}

	return null;
};

const insertImageAtSelection = (editor: Editor, payload?: unknown): void => {
	const range = editor.getRange();
	if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
		return;
	}

	const selection = editor.getSelection();
	if (!selection) return;

	const img = editor.createEl('img');

	const data = (payload ?? {}) as ImageCommandPayload;
	const src = typeof data.src === 'string' && data.src.trim() ? data.src.trim() : undefined;
	const alt = typeof data.alt === 'string' ? data.alt : undefined;
	const title = typeof data.title === 'string' ? data.title : undefined;

	img.src = src ?? 'https://placehold.co/400x300?text=Image';

	if (alt !== undefined) {
		img.alt = alt;
	}

	if (title !== undefined) {
		img.title = title;
	}

	editor.transforms.insertNode(img);
};

const updateImageAtSelection = (editor: Editor, payload?: unknown): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();

		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		const image = getActiveImageElement(editor);
		if (!image) {
			return;
		}

		const data = (payload ?? {}) as ImageCommandPayload;

		if (typeof data.src === 'string' && data.src.trim()) {
			image.setAttribute('src', data.src.trim());
		}

		if (data.alt !== undefined) {
			image.alt = data.alt;
		}

		if (data.title !== undefined) {
			image.title = data.title;
		}
	});
};

export const imagePlugin = definePlugin({
	name: 'image',
	commands: {
		'image.insert': (editor, payload) => {
			insertImageAtSelection(editor, payload);
		},
		'image.update': (editor, payload) => {
			updateImageAtSelection(editor, payload);
		}
	}
});
