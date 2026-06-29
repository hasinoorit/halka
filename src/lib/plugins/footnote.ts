import type { Editor, HalkaPlugin, CommandHandler } from '../core/editor.js';

export interface FootnoteItem {
	id: string;
	content: string; // HTML content
}

declare module '../core/editor.js' {
	interface EditorCommandMap {
		'footnote.addItem': string; // HTML content
		'footnote.removeItem': string; // id
		'footnote.moveItem': { id: string; index: number };
		'footnote.editItem': { id: string; content: string };
		'footnote.insertCitation': string; // footnoteId
		'footnote.normalize': void;
	}
	interface EditorStateMap {
		'footnote.items': FootnoteItem[];
	}
	interface EditorStatePayloadMap {
		'footnote.items': never;
	}
}

export const LIST_ATTR = 'data-footnote-list';
/** @deprecated Read for legacy content; new footnotes use `li.id` only. */
export const ITEM_ID_ATTR = 'data-footnote-item-id';
export const CITATION_ATTR = 'data-footnote-citation';
export const BACKLINKS_ATTR = 'data-footnote-backlinks';

const FOOTNOTE_STYLE_ID = 'halka-footnote-styles';
const ZERO_WIDTH_CHARS = /[\uFEFF\u200B]/g;

const FOOTNOTE_CSS = `
sup[${CITATION_ATTR}]>a{text-decoration:none;color:inherit}
[${BACKLINKS_ATTR}]{margin-right:.5em;font-size:.8em}
[${BACKLINKS_ATTR}]>a{text-decoration:none;color:inherit;opacity:.6}
`.trim();

const generateId = (): string => 'fn-' + Math.random().toString(36).substring(2, 11);

const generateCitationId = (): string => `citation-${generateId()}`;

const injectFootnoteStyles = (doc: Document): void => {
	if (doc.getElementById(FOOTNOTE_STYLE_ID)) return;

	const style = doc.createElement('style');
	style.id = FOOTNOTE_STYLE_ID;
	style.textContent = FOOTNOTE_CSS;
	doc.head.appendChild(style);
};

const getFootnoteId = (li: HTMLLIElement): string =>
	li.id || li.getAttribute(ITEM_ID_ATTR) || '';

const findListItem = (list: HTMLOListElement, id: string): HTMLLIElement | null => {
	for (const child of list.children) {
		if (child.tagName !== 'LI') continue;
		const li = child as HTMLLIElement;
		if (getFootnoteId(li) === id) return li;
	}
	return null;
};

const unwrapCitationLink = (sup: HTMLElement): HTMLAnchorElement | null => {
	const directLink = sup.querySelector(':scope > a');
	if (directLink) {
		const wrapper = sup.querySelector(':scope > span');
		wrapper?.remove();
		return directLink;
	}

	const wrappedLink = sup.querySelector(':scope > span a');
	if (wrappedLink) {
		sup.replaceChildren(wrappedLink);
		return wrappedLink;
	}

	return null;
};

const ensureCitationLink = (
	editor: Editor,
	sup: HTMLElement,
	footnoteId: string,
	index: number
): HTMLAnchorElement => {
	let link = unwrapCitationLink(sup);

	if (!link) {
		link = editor.createEl('a');
		sup.appendChild(link);
	}

	link.removeAttribute('style');
	link.href = `#${footnoteId}`;
	link.textContent = `[${index}]`;

	return link;
};

const normalizeCitation = (
	editor: Editor,
	sup: HTMLElement,
	footnoteId: string,
	index: number
): void => {
	if (!sup.id) {
		sup.id = generateCitationId();
	}

	sup.setAttribute(CITATION_ATTR, footnoteId);
	sup.setAttribute('contenteditable', 'false');
	sup.removeAttribute('style');
	ensureCitationLink(editor, sup, footnoteId, index);
};

const ensureListStructure = (list: HTMLOListElement): void => {
	list.setAttribute(LIST_ATTR, '');
	list.setAttribute('data-protected', 'true');
	list.setAttribute('contenteditable', 'false');
};

const ensureListItemStructure = (li: HTMLLIElement): string => {
	let footnoteId = getFootnoteId(li);

	if (!footnoteId) {
		footnoteId = generateId();
	}

	li.id = footnoteId;
	li.removeAttribute(ITEM_ID_ATTR);
	return footnoteId;
};

const createCitationElement = (
	editor: Editor,
	footnoteId: string,
	index: number
): HTMLElement => {
	const sup = editor.createEl('sup');
	sup.id = generateCitationId();
	sup.setAttribute(CITATION_ATTR, footnoteId);
	sup.setAttribute('contenteditable', 'false');

	const link = editor.createEl('a');
	link.href = `#${footnoteId}`;
	link.textContent = `[${index}]`;
	sup.appendChild(link);

	return sup;
};

const createBacklinkContainer = (editor: Editor): HTMLElement => {
	const container = editor.createEl('span');
	container.setAttribute(BACKLINKS_ATTR, '');
	return container;
};

const stripFootnoteArtifacts = (root: HTMLElement): void => {
	root.querySelectorAll(`sup[${CITATION_ATTR}] a, [${BACKLINKS_ATTR}], [${BACKLINKS_ATTR}] a`).forEach((node) => {
		node.removeAttribute('style');
	});

	root.querySelectorAll(`[${BACKLINKS_ATTR}]`).forEach((node) => {
		node.removeAttribute('contenteditable');
	});

	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let textNode = walker.nextNode() as Text | null;
	while (textNode) {
		if (ZERO_WIDTH_CHARS.test(textNode.data)) {
			textNode.data = textNode.data.replace(ZERO_WIDTH_CHARS, '');
		}
		textNode = walker.nextNode() as Text | null;
	}
};

export const footnotePlugin: HalkaPlugin = (editor: Editor) => {
	injectFootnoteStyles(editor.root.ownerDocument);

	const getList = (root: HTMLElement = editor.root): HTMLOListElement | null =>
		root.querySelector(`ol[${LIST_ATTR}]`);

	let syncing = false;

	const syncCitations = (root: HTMLElement = editor.root) => {
		if (syncing) return;
		syncing = true;

		try {
			stripFootnoteArtifacts(root);

			const list = getList(root);
			const items = list ? Array.from(list.children).filter((node) => node.tagName === 'LI') : [];
			const idToIndex = new Map<string, number>();

			if (list) {
				ensureListStructure(list);
			}

			items.forEach((node, idx) => {
				const li = node as HTMLLIElement;
				const id = ensureListItemStructure(li);
				idToIndex.set(id, idx + 1);
			});

			const citationsByFootnote = new Map<string, HTMLElement[]>();
			const allCitations = root.querySelectorAll(`sup[${CITATION_ATTR}]`);

			allCitations.forEach((node) => {
				const sup = node as HTMLElement;
				const footnoteId = sup.getAttribute(CITATION_ATTR);
				if (!footnoteId) return;

				const index = idToIndex.get(footnoteId);
				if (index === undefined) {
					sup.remove();
					return;
				}

				if (!citationsByFootnote.has(footnoteId)) {
					citationsByFootnote.set(footnoteId, []);
				}
				citationsByFootnote.get(footnoteId)!.push(sup);
				normalizeCitation(editor, sup, footnoteId, index);
			});

			if (!list) return;

			items.forEach((node) => {
				const li = node as HTMLLIElement;
				const footnoteId = getFootnoteId(li);
				if (!footnoteId) return;

				const citations = citationsByFootnote.get(footnoteId) || [];

				let backLinkContainer = li.querySelector(`[${BACKLINKS_ATTR}]`) as HTMLElement | null;
				if (!backLinkContainer) {
					backLinkContainer = createBacklinkContainer(editor);
					li.insertBefore(backLinkContainer, li.firstChild);
				}

				backLinkContainer.removeAttribute('style');
				backLinkContainer.removeAttribute('contenteditable');
				backLinkContainer.innerHTML = '';

				citations.forEach((sup, idx) => {
					if (!sup.id) {
						sup.id = generateCitationId();
					}

					const backLink = editor.createEl('a');
					backLink.href = `#${sup.id}`;
					backLink.textContent = citations.length > 1 ? ` [\u21e7${idx + 1}]` : ' [\u21e7]';
					backLinkContainer!.appendChild(backLink);
				});
			});
		} finally {
			syncing = false;
		}
	};

	const getFootnoteItems = (): FootnoteItem[] => {
		syncCitations();
		const list = getList();
		if (!list) return [];

		const items: FootnoteItem[] = [];
		Array.from(list.children).forEach((li) => {
			if (li.tagName !== 'LI') return;

			const id = getFootnoteId(li as HTMLLIElement);
			if (!id) return;

			const clone = li.cloneNode(true) as HTMLElement;
			clone.querySelector(`[${BACKLINKS_ATTR}]`)?.remove();

			items.push({
				id,
				content: clone.innerHTML
			});
		});
		return items;
	};

	const addFootnoteItem: CommandHandler<'footnote.addItem'> = (htmlContent) => {
		if (typeof htmlContent !== 'string') return;

		editor.runTransaction(() => {
			let list = getList(editor.root);
			if (!list) {
				list = editor.createEl('ol');
				ensureListStructure(list);
				editor.root.appendChild(list);
			}

			const li = editor.createEl('li');
			const id = generateId();
			li.id = id;
			li.innerHTML = htmlContent;
			list.appendChild(li);

			syncCitations();
		});
	};

	const removeFootnoteItem: CommandHandler<'footnote.removeItem'> = (id) => {
		if (typeof id !== 'string') return;

		editor.runTransaction(() => {
			const list = getList(editor.root);
			if (!list) return;

			findListItem(list, id)?.remove();

			if (list.children.length === 0) {
				list.remove();
			}

			syncCitations();
		});
	};

	const moveFootnoteItemAt: CommandHandler<'footnote.moveItem'> = (payload) => {
		if (!payload) return;
		const { id, index } = payload;

		editor.runTransaction(() => {
			const list = getList(editor.root);
			if (!list) return;

			const item = findListItem(list, id);
			if (!item) return;

			if (index < 0 || index >= list.children.length) return;

			const items = Array.from(list.children);
			const currentIndex = items.indexOf(item);

			if (currentIndex === index) return;

			if (index >= items.length - 1) {
				list.appendChild(item);
			} else if (currentIndex < index) {
				list.insertBefore(item, items[index + 1]);
			} else {
				list.insertBefore(item, items[index]);
			}

			syncCitations();
		});
	};

	const editItem: CommandHandler<'footnote.editItem'> = (payload) => {
		if (!payload) return;
		const { id, content } = payload;

		editor.runTransaction(() => {
			const list = getList(editor.root);
			if (!list) return;

			const item = findListItem(list, id);
			if (!item) return;

			const backLinkContainer = item.querySelector(`[${BACKLINKS_ATTR}]`);
			item.innerHTML = content;
			if (backLinkContainer) {
				item.prepend(backLinkContainer);
			}

			syncCitations();
		});
	};

	const insertFootnoteCitation: CommandHandler<'footnote.insertCitation'> = (footnoteId) => {
		if (typeof footnoteId !== 'string') return;

		editor.runTransaction((ed) => {
			const list = getList(ed.root);
			if (!list) return;

			const items = Array.from(list.children);
			const index = items.findIndex((li) => getFootnoteId(li as HTMLLIElement) === footnoteId);
			if (index === -1) return;

			const sup = createCitationElement(editor, footnoteId, index + 1);

			const range = ed.getRange();
			range.deleteContents();
			range.insertNode(sup);

			range.setStartAfter(sup);
			range.collapse(true);
			ed.setSelection(range);

			syncCitations();
		});
	};

	const normalizeFootnotes: CommandHandler<'footnote.normalize'> = () => {
		editor.runTransaction(() => {
			syncCitations();
		});
	};

	const handleContentChange = () => {
		if (getList() || editor.root.querySelector(`sup[${CITATION_ATTR}]`)) {
			syncCitations();
		}
	};

	editor.registerState('footnote.items', getFootnoteItems);

	editor.registerCommand('footnote.addItem', addFootnoteItem);
	editor.registerCommand('footnote.removeItem', removeFootnoteItem);
	editor.registerCommand('footnote.moveItem', moveFootnoteItemAt);
	editor.registerCommand('footnote.editItem', editItem);
	editor.registerCommand('footnote.insertCitation', insertFootnoteCitation);
	editor.registerCommand('footnote.normalize', normalizeFootnotes);

	editor.on('change', handleContentChange);
	syncCitations();

	return () => {
		editor.off('change', handleContentChange);

		editor.unregisterState('footnote.items', getFootnoteItems);

		editor.unregisterCommand('footnote.addItem', addFootnoteItem);
		editor.unregisterCommand('footnote.removeItem', removeFootnoteItem);
		editor.unregisterCommand('footnote.moveItem', moveFootnoteItemAt);
		editor.unregisterCommand('footnote.editItem', editItem);
		editor.unregisterCommand('footnote.insertCitation', insertFootnoteCitation);
		editor.unregisterCommand('footnote.normalize', normalizeFootnotes);
	};
};
