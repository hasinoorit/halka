import { type Editor, definePlugin } from '../core/editor.js';
import { Node as NodeHelpers } from '../helpers/index.js';
import { markdownToHtml } from '../helpers/markdown.js';

const ALLOWED_BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'TABLE', 'PRE']);
const ALLOWED_INLINE_TAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'A', 'SPAN', 'CODE', 'SUB', 'SUP', 'MARK', 'BR', 'S', 'STRIKE']);
const ALLOWED_VOID_TAGS = new Set(['BR', 'HR']);
const BLACKLIST_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'APPLET', 'SVG', 'MATH']);

const sanitizeNode = (node: Node, editor: Editor): Node | null => {
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
        return editor.createEl(tagName.toLowerCase());
    }

    // If tag is not allowed, but its children might be (e.g. section, div)
    if (!ALLOWED_BLOCK_TAGS.has(tagName) && !ALLOWED_INLINE_TAGS.has(tagName)) {
        const fragment = editor.window.document.createDocumentFragment();
        Array.from(el.childNodes).forEach((child) => {
            const cleanChild = sanitizeNode(child, editor);
            if (cleanChild) fragment.appendChild(cleanChild);
        });
        return fragment;
    }

    const cleanEl = editor.createEl(tagName);

    // Copy only allowed attributes
    if (tagName === 'A' && el.hasAttribute('href')) {
        cleanEl.setAttribute('href', el.getAttribute('href')!);
        if (el.hasAttribute('target')) cleanEl.setAttribute('target', el.getAttribute('target')!);
    }

    if (el.hasAttribute('style')) {
        // Basic style preservation (maybe color/background)
        // For production level, we might want to restrict this more
        cleanEl.setAttribute('style', el.getAttribute('style')!);
    }

    Array.from(el.childNodes).forEach((child) => {
        const cleanChild = sanitizeNode(child, editor);
        if (cleanChild) cleanEl.appendChild(cleanChild);
    });

    return cleanEl;
};

const processPastedHTML = (html: string, editor: Editor): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
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

    const isBlockNode = (node: Node): boolean =>
        NodeHelpers.isElementNode(node) &&
        (ALLOWED_BLOCK_TAGS.has((node as HTMLElement).tagName) ||
            ALLOWED_VOID_TAGS.has((node as HTMLElement).tagName));

    Array.from(body.childNodes).forEach((node) => {
        const cleanNode = sanitizeNode(node, editor);
        if (!cleanNode) return;

        // If it's a block, append directly and reset currentParagraph
        if (isBlockNode(cleanNode)) {
            fragment.appendChild(cleanNode);
            currentParagraph = null;
        } else if (cleanNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // Handle fragments (from disallowed tags)
            Array.from(cleanNode.childNodes).forEach(child => {
                if (isBlockNode(child)) {
                    fragment.appendChild(child);
                    currentParagraph = null;
                } else {
                    ensureParagraph().appendChild(child);
                }
            });
        } else {
            // Inline content goes into a paragraph
            ensureParagraph().appendChild(cleanNode);
        }
    });

    // Final cleanup: remove empty paragraphs
    Array.from(fragment.childNodes).forEach(node => {
        if (NodeHelpers.isElementNode(node) && node.tagName === 'P' && NodeHelpers.isEmpty(node)) {
            fragment.removeChild(node);
        }
    });

    const container = editor.createEl('div');
    container.appendChild(fragment);
    return container.innerHTML;
};

export const pastePlugin = definePlugin({
    name: 'paste',
    events: {
        paste: (editor, event) => {
            const clipboardEvent = event as ClipboardEvent;
            clipboardEvent.preventDefault();

            const clipboardData = clipboardEvent.clipboardData;
            if (!clipboardData) return;

            const html = clipboardData.getData('text/html');
            const text = clipboardData.getData('text/plain');

            let content = '';

            if (editor.inline) {
                if (html) {
                    editor.insertHTML(processPastedHTML(html, editor));
                    return;
                }
                if (text) {
                    editor.insertText(text.replace(/[\r\n]+/g, ' '));
                    return;
                }
            } else if (html) {
                content = processPastedHTML(html, editor);
            } else if (text) {
                content = processPastedHTML(markdownToHtml(text), editor);
            }

            if (content) {
                editor.insertHTML(content);
            }
        }
    }
});
