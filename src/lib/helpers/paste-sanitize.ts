import type { Editor } from '../core/editor.js';
import { defaultSchema } from '../core/schema.js';
import { Node as NodeHelpers } from './index.js';
import { normalizeExternalHTML } from './paste-normalize.js';

const EXTRA_BLOCK_TAGS = ['CAPTION', 'TFOOT'];
const EXTRA_INLINE_TAGS = ['B', 'I', 'MARK', 'DEL'];
const EXTRA_VOID_TAGS = ['IFRAME'];

const BLACKLIST_TAGS = new Set([
	'SCRIPT',
	'STYLE',
	'META',
	'LINK',
	'NOSCRIPT',
	'OBJECT',
	'APPLET',
	'SVG',
	'MATH'
]);

const ROOT_BLOCK_TAGS = new Set([
	'P',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'BLOCKQUOTE',
	'UL',
	'OL',
	'TABLE',
	'PRE',
	'HR',
	'IFRAME'
]);

const ALLOWED_BLOCK_TAGS = new Set([...defaultSchema.blocks, ...EXTRA_BLOCK_TAGS]);
const ALLOWED_INLINE_TAGS = new Set([...defaultSchema.inlines, ...EXTRA_INLINE_TAGS]);
const ALLOWED_VOID_TAGS = new Set([...defaultSchema.voids, ...EXTRA_VOID_TAGS]);

const EMBED_HOST_ALLOWLIST = new Set([
	'youtube.com',
	'www.youtube.com',
	'youtube-nocookie.com',
	'www.youtube-nocookie.com',
	'vimeo.com',
	'www.vimeo.com',
	'player.vimeo.com'
]);

const DEFAULT_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';

const FOOTNOTE_ATTRS: Record<string, string[]> = {
	SUP: ['id', 'data-footnote-citation', 'contenteditable'],
	OL: ['data-footnote-list', 'data-protected', 'contenteditable'],
	LI: ['data-footnote-item-id', 'id'],
	SPAN: ['data-footnote-backlinks', 'contenteditable']
};

const TAG_ATTRIBUTE_ALLOWLIST: Record<string, string[]> = {
	A: ['href', 'target', 'rel', 'title'],
	IMG: ['src', 'alt', 'title', 'width', 'height'],
	TD: ['colspan', 'rowspan'],
	TH: ['colspan', 'rowspan'],
	IFRAME: ['src', 'allow', 'allowfullscreen', 'title', 'width', 'height', 'sandbox']
};

export type PasteSanitizeOptions = {
	allowDataUrls?: boolean;
	onImageUpload?: (file: File | Blob) => Promise<string>;
};

const sanitizeHref = (href: string): string => {
	const trimmed = href.trim();
	if (/^javascript:/i.test(trimmed)) return '#';
	return trimmed;
};

const isRemoteImageSrc = (src: string): boolean => {
	const trimmed = src.trim();
	return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//');
};

const isDataImageSrc = (src: string): boolean => /^data:image\//i.test(src.trim());

const isAllowedEmbedSrc = (src: string): boolean => {
	try {
		const url = new URL(src, 'https://example.com');
		return EMBED_HOST_ALLOWLIST.has(url.hostname.toLowerCase());
	} catch {
		return false;
	}
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
	const response = await fetch(dataUrl);
	return response.blob();
};

export const copyAllowedAttributes = (
	tagName: string,
	source: HTMLElement,
	target: HTMLElement,
	options: PasteSanitizeOptions
): void => {
	const allowed = TAG_ATTRIBUTE_ALLOWLIST[tagName] ?? [];
	for (const attr of allowed) {
		if (!source.hasAttribute(attr)) continue;
		let value = source.getAttribute(attr)!;

		if (tagName === 'A' && attr === 'href') {
			value = sanitizeHref(value);
		}

		if (tagName === 'IMG' && attr === 'src') {
			if (isDataImageSrc(value)) {
				if (options.allowDataUrls) {
					target.setAttribute(attr, value);
				}
				continue;
			}
			if (!isRemoteImageSrc(value)) {
				continue;
			}
		}

		if (tagName === 'IFRAME' && attr === 'src' && !isAllowedEmbedSrc(value)) {
			continue;
		}

		target.setAttribute(attr, value);
	}

	const footnoteAttrs = FOOTNOTE_ATTRS[tagName] ?? [];
	for (const attr of footnoteAttrs) {
		if (source.hasAttribute(attr)) {
			target.setAttribute(attr, source.getAttribute(attr)!);
		}
	}

	if (source.hasAttribute('style')) {
		target.setAttribute('style', source.getAttribute('style')!);
	}

	if (tagName === 'IFRAME' && target.hasAttribute('src') && !target.hasAttribute('sandbox')) {
		target.setAttribute('sandbox', DEFAULT_IFRAME_SANDBOX);
	}
};

const createSanitizedVoid = (
	tagName: string,
	source: HTMLElement,
	editor: Editor,
	options: PasteSanitizeOptions
): HTMLElement | null => {
	if (tagName === 'IMG') {
		const src = source.getAttribute('src') ?? '';
		if (!src) return null;
		if (isDataImageSrc(src)) {
			if (options.allowDataUrls) {
				const img = editor.createEl('img');
				copyAllowedAttributes('IMG', source, img, options);
				return img;
			}
			return null;
		}
		if (!isRemoteImageSrc(src)) return null;
	}

	if (tagName === 'IFRAME') {
		const src = source.getAttribute('src') ?? '';
		if (!isAllowedEmbedSrc(src)) return null;
	}

	const el = editor.createEl(tagName.toLowerCase());
	copyAllowedAttributes(tagName, source, el, options);
	if (tagName === 'IFRAME' && !el.hasAttribute('src')) return null;
	if (tagName === 'IMG' && !el.hasAttribute('src')) return null;
	return el;
};

const sanitizeNode = (
	node: Node,
	editor: Editor,
	options: PasteSanitizeOptions
): Node | null => {
	if (NodeHelpers.isTextNode(node)) {
		return node.cloneNode(true);
	}

	if (!NodeHelpers.isElementNode(node)) {
		return null;
	}

	const el = node as HTMLElement;
	const tagName = el.tagName.toUpperCase();

	if (BLACKLIST_TAGS.has(tagName)) {
		return null;
	}

	if (ALLOWED_VOID_TAGS.has(tagName)) {
		if (tagName === 'BR' || tagName === 'HR') {
			return editor.createEl(tagName.toLowerCase());
		}
		return createSanitizedVoid(tagName, el, editor, options);
	}

	if (!ALLOWED_BLOCK_TAGS.has(tagName) && !ALLOWED_INLINE_TAGS.has(tagName)) {
		const fragment = editor.window.document.createDocumentFragment();
		Array.from(el.childNodes).forEach((child) => {
			const cleanChild = sanitizeNode(child, editor, options);
			if (cleanChild) fragment.appendChild(cleanChild);
		});
		return fragment;
	}

	const outputTag = tagName === 'DEL' ? 's' : tagName;
	const cleanEl = editor.createEl(outputTag);
	copyAllowedAttributes(tagName, el, cleanEl, options);

	Array.from(el.childNodes).forEach((child) => {
		const cleanChild = sanitizeNode(child, editor, options);
		if (cleanChild) cleanEl.appendChild(cleanChild);
	});

	return cleanEl;
};

const isRootBlockNode = (node: Node): boolean =>
	NodeHelpers.isElementNode(node) &&
	(ROOT_BLOCK_TAGS.has((node as HTMLElement).tagName.toUpperCase()) ||
		ALLOWED_VOID_TAGS.has((node as HTMLElement).tagName.toUpperCase()));

const resolveDataUrlImagesInHtml = async (
	html: string,
	options: PasteSanitizeOptions
): Promise<string> => {
	if (!options.onImageUpload) return html;

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const images = Array.from(doc.querySelectorAll('img')).filter((img) => {
		const src = img.getAttribute('src') ?? '';
		return isDataImageSrc(src);
	});

	if (images.length === 0) return html;

	for (const img of images) {
		const src = img.getAttribute('src');
		if (!src) continue;
		try {
			const blob = await dataUrlToBlob(src);
			const uploadedUrl = await options.onImageUpload!(blob);
			img.setAttribute('src', uploadedUrl);
		} catch {
			img.remove();
		}
	}

	return doc.body.innerHTML;
};

export const processPastedHTML = async (
	html: string,
	editor: Editor,
	options: PasteSanitizeOptions = {}
): Promise<string> => {
	let normalizedHtml = html;
	const parser = new DOMParser();
	const preDoc = parser.parseFromString(html, 'text/html');
	normalizeExternalHTML(preDoc);
	normalizedHtml = preDoc.body.innerHTML;

	if (options.onImageUpload) {
		normalizedHtml = await resolveDataUrlImagesInHtml(normalizedHtml, options);
	}

	const doc = parser.parseFromString(normalizedHtml, 'text/html');
	const body = doc.body;

	const fragment = editor.window.document.createDocumentFragment();
	let currentParagraph: HTMLElement | null = null;

	const ensureParagraph = () => {
		if (!currentParagraph) {
			currentParagraph = editor.createEl('p');
			fragment.appendChild(currentParagraph);
		}
		return currentParagraph;
	};

	Array.from(body.childNodes).forEach((node) => {
		const cleanNode = sanitizeNode(node, editor, options);
		if (!cleanNode) return;

		if (isRootBlockNode(cleanNode)) {
			fragment.appendChild(cleanNode);
			currentParagraph = null;
		} else if (cleanNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
			Array.from(cleanNode.childNodes).forEach((child) => {
				if (isRootBlockNode(child)) {
					fragment.appendChild(child);
					currentParagraph = null;
				} else {
					ensureParagraph().appendChild(child);
				}
			});
		} else {
			ensureParagraph().appendChild(cleanNode);
		}
	});

	Array.from(fragment.childNodes).forEach((node) => {
		if (NodeHelpers.isElementNode(node) && node.tagName === 'P' && NodeHelpers.isEmpty(node)) {
			fragment.removeChild(node);
		}
	});

	const container = editor.createEl('div');
	container.appendChild(fragment);
	return container.innerHTML;
};

export const getClipboardImageFile = (clipboardData: DataTransfer): File | null => {
	if (clipboardData.files?.length) {
		for (const file of Array.from(clipboardData.files)) {
			if (file.type.startsWith('image/')) return file;
		}
	}

	if (clipboardData.items?.length) {
		for (const item of Array.from(clipboardData.items)) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) return file;
			}
		}
	}

	return null;
};
