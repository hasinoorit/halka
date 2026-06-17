import { describe, it, expect, beforeEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';

describe('HalkaEditor Merging', () => {
    let editor: HalkaEditor;
    let root: HTMLElement;

    beforeEach(() => {
        root = document.createElement('div');
        document.body.appendChild(root);
        editor = new HalkaEditor(root);
    });

    it('merges adjacent strong tags inside a block', () => {
        editor.setHTML('<p><strong>a</strong></p>');

        const p = root.querySelector('p')!;
        const strong = p.querySelector('strong')!;
        const range = document.createRange();
        range.selectNodeContents(strong);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        editor.runTransaction((ed) => {
            const s2 = document.createElement('strong');
            s2.textContent = 'b';
            p.appendChild(s2);
        });

        expect(root.innerHTML).toBe('<p><strong>ab</strong></p>');
    });

    it('merges adjacent em tags when selection root covers them', () => {
        editor.setHTML('<p><em>a</em></p>');
        const em = root.querySelector('em')!;
        const range = document.createRange();
        range.selectNodeContents(em);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        editor.runTransaction((ed) => {
            const em2 = document.createElement('em');
            em2.textContent = 'b';
            root.querySelector('p')!.appendChild(em2);
        });

        expect(root.innerHTML).toBe('<p><em>ab</em></p>');
    });

    it('does not merge direct children of editor root', () => {
        editor.setHTML('<p>a</p><p>b</p>');

        const p1 = root.querySelector('p')!;
        const range = document.createRange();
        range.selectNodeContents(p1);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        editor.runTransaction((ed) => {
            // No changes, just trigger transaction
        });

        // P tags are direct children of editor root, they should NOT be merged
        expect(root.innerHTML).toBe('<p>a</p><p>b</p>');
    });

    it('merges strong tags when they are direct children', () => {
        // Even if strong tags are direct children, they should merge if they are similar.
        // isMergeable protects blocks (P, DIV), so merging at root level is safe for inlines.
        editor.setHTML('<strong>a</strong><strong>b</strong>');

        const s1 = root.querySelector('strong')!;
        const range = document.createRange();
        range.selectNodeContents(s1);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        editor.runTransaction((ed) => {
            // Trigger merging
        });

        expect(root.innerHTML).toBe('<p><strong>ab</strong></p>');
    });

    it('reproduces user issue: merges rich and text in a paragraph', () => {
        const html = '<p>Halka <strong>rich </strong><strong>text</strong> editor demo.</p>';
        editor.setHTML(html);

        // Selection in "rich "
        const strong1 = root.querySelector('strong')!;
        const range = document.createRange();
        range.setStart(strong1.firstChild!, 0);
        range.setEnd(strong1.firstChild!, 4);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        editor.runTransaction((ed) => {
            // No changes, just trigger merging logic
        });

        expect(root.innerHTML).toBe('<p>Halka <strong>rich text</strong> editor demo.</p>');
    });

    it('merges strong tags when selection is the parent paragraph', () => {
        const html = '<p><strong>a</strong><strong>b</strong></p>';
        editor.setHTML(html);

        const p = root.querySelector('p')!;
        const range = document.createRange();
        range.selectNodeContents(p);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);

        editor.runTransaction((ed) => {
            // Trigger merging
        });

        expect(root.innerHTML).toBe('<p><strong>ab</strong></p>');
    });

});
