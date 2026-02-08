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
    }
    interface EditorStateMap {
        'footnote.items': FootnoteItem[];
    }
    interface EditorStatePayloadMap {
        'footnote.items': never;
    }
}

const LIST_ATTR = 'data-footnote-list';
const ITEM_ID_ATTR = 'data-footnote-item-id';
const CITATION_ATTR = 'data-footnote-citation';
const BACKLINKS_ATTR = 'data-footnote-backlinks';

export const footnotePlugin: HalkaPlugin = (editor: Editor) => {
    const getList = (root: HTMLElement = editor.root): HTMLOListElement | null => {
        return root.querySelector(`ol[${LIST_ATTR}="true"]`);
    };

    const generateId = (): string => {
        return 'fn-' + Math.random().toString(36).substring(2, 11);
    };

    const syncCitations = (root: HTMLElement = editor.root) => {
        const list = getList(root);
        const items = list ? Array.from(list.children) : [];
        const idToIndex = new Map<string, number>();

        items.forEach((li, idx) => {
            const id = li.getAttribute(ITEM_ID_ATTR);
            if (id) idToIndex.set(id, idx + 1);
        });

        const citationsByFootnote = new Map<string, HTMLElement[]>();
        const allCitations = root.querySelectorAll(`sup[${CITATION_ATTR}]`);

        allCitations.forEach((sup) => {
            const footnoteId = sup.getAttribute(CITATION_ATTR);
            if (!footnoteId) return;

            const index = idToIndex.get(footnoteId);
            if (index === undefined) {
                sup.remove();
            } else {
                if (!citationsByFootnote.has(footnoteId)) {
                    citationsByFootnote.set(footnoteId, []);
                }
                citationsByFootnote.get(footnoteId)!.push(sup as HTMLElement);

                const a = sup.querySelector('a');
                if (a) {
                    a.textContent = `[${index}]`;
                    a.href = `#${footnoteId}`;
                }
            }
        });

        if (!list) return;

        items.forEach((li) => {
            const footnoteId = li.getAttribute(ITEM_ID_ATTR);
            if (!footnoteId) return;

            const citations = citationsByFootnote.get(footnoteId) || [];

            let backLinkContainer = li.querySelector(`[${BACKLINKS_ATTR}]`) as HTMLElement | null;
            if (!backLinkContainer) {
                backLinkContainer = editor.createEl('span');
                backLinkContainer.setAttribute(BACKLINKS_ATTR, 'true');
                backLinkContainer.setAttribute('contenteditable', 'false');
                backLinkContainer.style.marginRight = '8px';
                backLinkContainer.style.fontSize = '0.8em';
                li.insertBefore(backLinkContainer, li.firstChild);
            }

            backLinkContainer.innerHTML = '';

            if (citations.length > 0) {
                citations.forEach((sup, idx) => {
                    const backLink = editor.createEl('a');
                    backLink.href = `#${sup.id}`;
                    backLink.textContent = citations.length > 1 ? ` [\u21e7${idx + 1}]` : ' [\u21e7]';
                    backLink.style.textDecoration = 'none';
                    backLink.style.color = 'inherit';
                    backLink.style.opacity = '0.6';
                    backLinkContainer!.appendChild(backLink);
                });
            }
        });
    };

    const getFootnoteItems = (): FootnoteItem[] => {
        const list = getList();
        if (!list) return [];

        const items: FootnoteItem[] = [];
        Array.from(list.children).forEach((li) => {
            if (li.tagName === 'LI') {
                const id = li.getAttribute(ITEM_ID_ATTR) || '';
                if (id) {
                    const clone = li.cloneNode(true) as HTMLElement;
                    const backLinkContainer = clone.querySelector(`[${BACKLINKS_ATTR}]`);
                    if (backLinkContainer) {
                        backLinkContainer.remove();
                    }

                    items.push({
                        id,
                        content: clone.innerHTML
                    });
                }
            }
        });
        return items;
    };

    const addFootnoteItem: CommandHandler<'footnote.addItem'> = (htmlContent) => {
        if (typeof htmlContent !== 'string') return;

        editor.runTransaction(() => {
            let list = getList(editor.root);
            if (!list) {
                list = editor.createEl('ol');
                list.setAttribute(LIST_ATTR, 'true');
                list.setAttribute('data-protected', 'true');
                list.setAttribute('contenteditable', 'false');
                editor.root.appendChild(list);
            }

            const li = editor.createEl('li');
            const id = generateId();
            li.id = id;
            li.setAttribute(ITEM_ID_ATTR, id);
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

            const item = list.querySelector(`li[${ITEM_ID_ATTR}="${id}"]`);
            if (item) {
                item.remove();
            }

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

            const item = list.querySelector(`li[${ITEM_ID_ATTR}="${id}"]`);
            if (!item) return;

            if (index < 0 || index >= list.children.length) return;

            const items = Array.from(list.children);
            const currentIndex = items.indexOf(item);

            if (currentIndex === index) return;

            if (index >= items.length - 1) {
                list.appendChild(item);
            } else {
                if (currentIndex < index) {
                    list.insertBefore(item, items[index + 1]);
                } else {
                    list.insertBefore(item, items[index]);
                }
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

            const item = list.querySelector(`li[${ITEM_ID_ATTR}="${id}"]`) as HTMLLIElement;
            if (item) {
                const backLinkContainer = item.querySelector(`[${BACKLINKS_ATTR}]`);
                item.innerHTML = content;
                if (backLinkContainer) {
                    item.prepend(backLinkContainer);
                }
                syncCitations();
            }
        });
    };

    const insertFootnoteCitation: CommandHandler<'footnote.insertCitation'> = (footnoteId) => {
        if (typeof footnoteId !== 'string') return;

        editor.runTransaction((ed) => {
            const list = getList(ed.root);
            if (!list) return;

            const items = Array.from(list.children);
            const index = items.findIndex((li) => li.getAttribute(ITEM_ID_ATTR) === footnoteId);
            if (index === -1) return;

            const sup = editor.createEl('sup');
            const citationId = `citation-${generateId()}`;
            sup.id = citationId;
            sup.setAttribute(CITATION_ATTR, footnoteId);
            sup.setAttribute('contenteditable', 'false');

            const a = editor.createEl('a');
            a.href = `#${footnoteId}`;
            a.textContent = `[${index + 1}]`;
            a.style.textDecoration = 'none';
            a.style.color = 'inherit';

            sup.appendChild(a);

            const range = ed.getRange();
            range.deleteContents();
            range.insertNode(sup);

            range.setStartAfter(sup);
            range.collapse(true);
            ed.setSelection(range);

            syncCitations();
        });
    };

    editor.registerState('footnote.items', getFootnoteItems);

    editor.registerCommand('footnote.addItem', addFootnoteItem);
    editor.registerCommand('footnote.removeItem', removeFootnoteItem);
    editor.registerCommand('footnote.moveItem', moveFootnoteItemAt);
    editor.registerCommand('footnote.editItem', editItem);
    editor.registerCommand('footnote.insertCitation', insertFootnoteCitation);

    return () => {
        editor.unregisterState('footnote.items', getFootnoteItems);

        editor.unregisterCommand('footnote.addItem', addFootnoteItem);
        editor.unregisterCommand('footnote.removeItem', removeFootnoteItem);
        editor.unregisterCommand('footnote.moveItem', moveFootnoteItemAt);
        editor.unregisterCommand('footnote.editItem', editItem);
        editor.unregisterCommand('footnote.insertCitation', insertFootnoteCitation);
    };
};
