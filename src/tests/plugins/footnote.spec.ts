import { describe, it, expect, beforeEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { footnotePlugin, type FootnoteItem } from '../../lib/plugins/footnote.js';

const createRoot = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    return root;
};

describe('footnotePlugin', () => {
    let root: HTMLElement;
    let editor: HalkaEditor;

    beforeEach(() => {
        root = createRoot();
        editor = new HalkaEditor(root, { shortcuts: false, plugins: [footnotePlugin] });
        editor.setHTML('<p><br></p>');
        return () => {
            document.body.removeChild(root);
            editor.destroy();
        };
    });

    it('adds a footnote item and gets it back', () => {
        editor.execCommand('footnote.addItem', 'Footnote 1 content');
        const items = editor.getState('footnote.items') as FootnoteItem[];
        expect(items.length).toBe(1);
        expect(items[0].content).toBe('Footnote 1 content');
    });

    it('inserts a citation and updates its number', () => {
        // Set HTML BEFORE adding footnote to avoid wiping the list
        editor.setHTML('<p>Text here</p>');
        editor.execCommand('footnote.addItem', 'Footnote 1');

        const items = editor.getState('footnote.items') as FootnoteItem[];
        const fnId = items[0].id;

        const p = root.querySelector('p')!;
        const textNode = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(textNode, 4);
        range.collapse(true);
        editor.setSelection(range);

        editor.execCommand('footnote.insertCitation', fnId);

        const sup = root.querySelector('sup');
        expect(sup).not.toBeNull();
        expect(sup?.textContent).toBe('[1]');
    });

    it('cleans up citations when a footnote is removed', () => {
        // Set HTML BEFORE adding footnote
        editor.setHTML('<p>Cite</p>');
        editor.execCommand('footnote.addItem', 'To be removed');

        const items = editor.getState('footnote.items') as FootnoteItem[];
        const id = items[0].id;

        const p = root.querySelector('p')!;
        const range = document.createRange();
        range.selectNodeContents(p.firstChild!);
        range.collapse(false);
        editor.setSelection(range);
        editor.execCommand('footnote.insertCitation', id);

        expect(root.querySelectorAll('sup').length).toBe(1);

        editor.execCommand('footnote.removeItem', id);
        expect(root.querySelectorAll('sup').length).toBe(0);
    });

    it('edits a footnote item while preserving backlinks', () => {
        // Set HTML BEFORE adding footnote
        editor.setHTML('<p>Text</p>');
        editor.execCommand('footnote.addItem', 'Old');

        const itemsBefore = editor.getState('footnote.items') as FootnoteItem[];
        const id = itemsBefore[0].id;

        const p = root.querySelector('p')!;
        const range = document.createRange();
        range.selectNodeContents(p.firstChild!);
        range.collapse(false);
        editor.setSelection(range);
        editor.execCommand('footnote.insertCitation', id);

        editor.execCommand('footnote.editItem', { id, content: 'New' });

        const itemsAfter = editor.getState('footnote.items') as FootnoteItem[];
        expect(itemsAfter[0].content).toBe('New');

        const li = root.querySelector('li');
        expect(li?.querySelector('[data-footnote-backlinks]')).not.toBeNull();
    });
});
