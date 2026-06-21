import { Node as NodeHelpers, isElementNode } from '../helpers/index.js';
import {
	isJoinableBlock,
	isEmptyBlock,
	getPreviousBlockSibling
} from '../helpers/block.js';
import { type Editor, type HalkaPlugin, definePlugin } from '../core/editor.js';

export type ImageLayout = 'inline' | 'block';

export type ImageStyles = {
	display?: string;
	width?: string;
	height?: string;
	maxWidth?: string;
};

export type ImageCommandPayload = {
	src?: string;
	alt?: string;
	title?: string;
	layout?: ImageLayout;
	style?: ImageStyles;
};

const STYLE_PROPS: { key: keyof ImageStyles; css: string }[] = [
	{ key: 'display', css: 'display' },
	{ key: 'width', css: 'width' },
	{ key: 'height', css: 'height' },
	{ key: 'maxWidth', css: 'max-width' }
];

const DEFAULT_BLOCK_STYLES: ImageStyles = {
	display: 'block',
	maxWidth: '100%'
};

const DEFAULT_INLINE_STYLES: ImageStyles = {
	display: 'inline'
};

const readImageStyles = (image: HTMLImageElement): ImageStyles => ({
	display: image.style.display || '',
	width: image.style.width || '',
	height: image.style.height || '',
	maxWidth: image.style.maxWidth || ''
});

const applyImageStyles = (image: HTMLImageElement, style?: ImageStyles): void => {
	if (!style) return;

	for (const { key, css } of STYLE_PROPS) {
		if (style[key] === undefined) continue;
		const value = style[key]?.trim() ?? '';
		if (value) {
			image.style.setProperty(css, value);
		} else {
			image.style.removeProperty(css);
		}
	}

	if (!image.getAttribute('style')) {
		image.removeAttribute('style');
	}
};

const isMeaningfulChild = (node: Node): boolean => {
	if (node.nodeType === Node.TEXT_NODE) {
		return (node.textContent ?? '').trim() !== '';
	}
	if (isElementNode(node)) {
		return node.tagName !== 'BR';
	}
	return false;
};

const getMeaningfulChildren = (block: HTMLElement): Node[] =>
	Array.from(block.childNodes).filter(isMeaningfulChild);

const hasMeaningfulContent = (fragment: DocumentFragment | Node): boolean => {
	if (fragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
		return Array.from((fragment as DocumentFragment).childNodes).some(isMeaningfulChild);
	}
	return isMeaningfulChild(fragment);
};

const findJoinableBlockParent = (img: HTMLImageElement, root: HTMLElement): HTMLElement | null => {
	let node = img.parentElement;
	while (node && node !== root) {
		if (isJoinableBlock(node.tagName)) {
			return node;
		}
		node = node.parentElement;
	}
	return null;
};

export const inferImageLayout = (img: HTMLImageElement, root: HTMLElement): ImageLayout => {
	if (img.parentElement === root) {
		return 'block';
	}

	const block = findJoinableBlockParent(img, root);
	if (!block) {
		return 'block';
	}

	const meaningful = getMeaningfulChildren(block);
	if (meaningful.length === 1 && meaningful[0] === img) {
		return 'block';
	}

	return 'inline';
};

const SELECTED_CLASS = 'halka-selected-image';

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

const clearSelectedImages = (root: HTMLElement): void => {
	root.querySelectorAll(`img.${SELECTED_CLASS}`).forEach((img) => {
		img.classList.remove(SELECTED_CLASS);
	});
};

const selectImageAtElement = (editor: Editor, img: HTMLImageElement): void => {
	const range = editor.window.document.createRange();
	range.selectNode(img);
	editor.setSelection(range);
};

const syncImageHighlight = (editor: Editor): void => {
	clearSelectedImages(editor.root);
	const img = getActiveImageElement(editor);
	if (img) {
		img.classList.add(SELECTED_CLASS);
	}
};

const isAtBlockStart = (range: Range, block: HTMLElement): boolean => {
	const testRange = range.cloneRange();
	const blockRange = block.ownerDocument.createRange();
	blockRange.selectNodeContents(block);
	blockRange.setEnd(range.startContainer, range.startOffset);
	return blockRange.toString().length === 0;
};

const isAtBlockEnd = (range: Range, block: HTMLElement): boolean => {
	const blockRange = block.ownerDocument.createRange();
	blockRange.selectNodeContents(block);
	blockRange.setStart(range.endContainer, range.endOffset);
	return blockRange.toString().length === 0;
};

const createImageFromPayload = (editor: Editor, data: ImageCommandPayload): HTMLImageElement => {
	const img = editor.createEl('img');
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

	return img;
};

const mergeLayoutStyles = (layout: ImageLayout, style?: ImageStyles): ImageStyles => {
	if (layout === 'block') {
		return {
			display: style?.display ?? DEFAULT_BLOCK_STYLES.display,
			width: style?.width,
			height: style?.height,
			maxWidth: style?.maxWidth ?? DEFAULT_BLOCK_STYLES.maxWidth
		};
	}

	return {
		display: style?.display ?? DEFAULT_INLINE_STYLES.display,
		width: style?.width,
		height: style?.height,
		maxWidth: style?.maxWidth
	};
};

const createImageParagraph = (editor: Editor, img: HTMLImageElement): HTMLElement => {
	const paragraph = editor.createEl('p');
	paragraph.appendChild(img);
	return paragraph;
};

const insertBlockImage = (editor: Editor, img: HTMLImageElement): void => {
	const range = editor.getRange();
	range.deleteContents();

	const root = editor.root;
	const block = NodeHelpers.getClosestBlockElement(range.commonAncestorContainer, root);

	if (!block || block === root) {
		root.appendChild(createImageParagraph(editor, img));
		editor.selection.setCursorAfter(img);
		return;
	}

	if (isEmptyBlock(block)) {
		block.replaceChildren(img);
		editor.selection.setCursorAfter(img);
		return;
	}

	if (isAtBlockStart(range, block)) {
		block.parentNode?.insertBefore(createImageParagraph(editor, img), block);
		editor.selection.setCursorAfter(img);
		return;
	}

	if (isAtBlockEnd(range, block)) {
		block.parentNode?.insertBefore(createImageParagraph(editor, img), block.nextSibling);
		editor.selection.setCursorAfter(img);
		return;
	}

	const splitRange = range.cloneRange();
	splitRange.setEnd(block, block.childNodes.length);
	const trailing = splitRange.extractContents();

	const imageParagraph = createImageParagraph(editor, img);
	block.parentNode?.insertBefore(imageParagraph, block.nextSibling);

	const trailingParagraph = editor.createEl('p');
	if (hasMeaningfulContent(trailing)) {
		trailingParagraph.appendChild(trailing);
	} else {
		trailingParagraph.appendChild(editor.createEl('br'));
	}
	block.parentNode?.insertBefore(trailingParagraph, imageParagraph.nextSibling);

	editor.selection.setCursorAfter(img);
};

const promoteImageToBlock = (editor: Editor, img: HTMLImageElement): void => {
	const root = editor.root;

	if (inferImageLayout(img, root) === 'block') {
		return;
	}

	const block = findJoinableBlockParent(img, root);
	if (!block) {
		root.insertBefore(createImageParagraph(editor, img), img.nextSibling);
		img.remove();
		return;
	}

	const parent = block.parentNode;
	if (!parent) return;

	const beforeRange = editor.window.document.createRange();
	beforeRange.setStart(block, 0);
	beforeRange.setEndBefore(img);
	const beforeFragment = beforeRange.extractContents();

	const afterRange = editor.window.document.createRange();
	afterRange.setStartAfter(img);
	afterRange.setEnd(block, block.childNodes.length);
	const afterFragment = afterRange.extractContents();

	img.remove();

	const imageParagraph = createImageParagraph(editor, img);

	if (hasMeaningfulContent(beforeFragment)) {
		const beforeParagraph = editor.createEl('p');
		beforeParagraph.appendChild(beforeFragment);
		parent.insertBefore(beforeParagraph, block);
	}

	parent.insertBefore(imageParagraph, block);

	if (hasMeaningfulContent(afterFragment)) {
		const afterParagraph = editor.createEl('p');
		afterParagraph.appendChild(afterFragment);
		parent.insertBefore(afterParagraph, block);
	}

	block.remove();
};

const demoteImageToInline = (editor: Editor, img: HTMLImageElement): void => {
	const root = editor.root;

	if (inferImageLayout(img, root) === 'inline') {
		return;
	}

	const imageBlock =
		img.parentElement === root ? null : findJoinableBlockParent(img, root);

	if (imageBlock) {
		const previous = getPreviousBlockSibling(imageBlock, (tag) => editor.schema.isBlock(tag));
		if (previous && isJoinableBlock(previous.tagName)) {
			img.remove();
			previous.appendChild(img);
			if (isEmptyBlock(imageBlock)) {
				imageBlock.remove();
			}
			editor.selection.setCursorAfter(img);
			return;
		}

		const next = imageBlock.nextElementSibling;
		if (next && isElementNode(next) && isJoinableBlock(next.tagName)) {
			img.remove();
			(next as HTMLElement).insertBefore(img, next.firstChild);
			if (isEmptyBlock(imageBlock)) {
				imageBlock.remove();
			}
			editor.selection.setCursorAfter(img);
			return;
		}
	}

	const insertBefore = imageBlock?.nextSibling ?? img.nextSibling;
	img.remove();

	if (imageBlock && isEmptyBlock(imageBlock)) {
		imageBlock.remove();
	}

	const paragraph = editor.createEl('p');
	paragraph.appendChild(img);
	root.insertBefore(paragraph, insertBefore);
	editor.selection.setCursorAfter(img);
};

const insertImageAtSelection = (editor: Editor, payload?: unknown): void => {
	const range = editor.getRange();
	if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
		return;
	}

	if (!editor.getSelection()) return;

	const data = (payload ?? {}) as ImageCommandPayload;
	const layout = data.layout ?? 'inline';
	const img = createImageFromPayload(editor, data);
	applyImageStyles(img, mergeLayoutStyles(layout, data.style));

	editor.runTransaction(() => {
		if (layout === 'block') {
			insertBlockImage(editor, img);
		} else {
			editor.transforms.insertNode(img);
		}
	});
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
		const targetLayout = data.layout ?? inferImageLayout(image, editor.root);
		const currentLayout = inferImageLayout(image, editor.root);

		if (targetLayout !== currentLayout) {
			if (targetLayout === 'block') {
				promoteImageToBlock(editor, image);
			} else {
				demoteImageToInline(editor, image);
			}
		}

		if (typeof data.src === 'string' && data.src.trim()) {
			image.setAttribute('src', data.src.trim());
		}

		if (data.alt !== undefined) {
			image.alt = data.alt;
		}

		if (data.title !== undefined) {
			image.title = data.title;
		}

		if (data.style !== undefined || data.layout !== undefined) {
			applyImageStyles(image, mergeLayoutStyles(targetLayout, data.style));
		}
	});
};

const corePlugin = definePlugin({
	name: 'image',
	commands: {
		'image.insert': (editor, payload) => {
			insertImageAtSelection(editor, payload);
		},
		'image.update': (editor, payload) => {
			updateImageAtSelection(editor, payload);
		}
	},
	states: {
		'image.active': (editor) => {
			const image = getActiveImageElement(editor);
			if (!image) return null;
			return {
				src: image.getAttribute('src') || '',
				alt: image.getAttribute('alt') || '',
				title: image.getAttribute('title') || '',
				layout: inferImageLayout(image, editor.root),
				style: readImageStyles(image)
			};
		}
	}
});

export const imagePlugin: HalkaPlugin = (editor) => {
	const cleanupCore = corePlugin(editor);

	const handleMouseDown = (event: MouseEvent) => {
		const target = event.target;
		if (!isElementNode(target) || !editor.root.contains(target)) return;

		if (target.tagName === 'IMG') {
			event.preventDefault();
			selectImageAtElement(editor, target as HTMLImageElement);
		}
	};

	const onFormatChange = () => syncImageHighlight(editor);

	editor.root.addEventListener('mousedown', handleMouseDown);
	editor.on('formatChange', onFormatChange);

	return () => {
		cleanupCore();
		editor.root.removeEventListener('mousedown', handleMouseDown);
		editor.off('formatChange', onFormatChange);
		clearSelectedImages(editor.root);
	};
};
