import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { markdownShortcutsPlugin } from '../../lib/plugins/markdown-shortcuts.js';
import { listPlugin } from '../../lib/plugins/list.js';

const createRoot = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    return root;
};

describe('markdownShortcutsPlugin', () => {
    it('converts # to h1', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>#</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 1);
        range.setEnd(text, 1);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        expect(root.querySelector('h1')).not.toBeNull();
        expect(root.querySelector('h1')?.textContent).toBe('\u00A0'); // Placeholder char

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts ### to h3', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>###</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 3);
        range.setEnd(text, 3);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        expect(root.querySelector('h3')).not.toBeNull();

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts > to blockquote', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>></p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 1);
        range.setEnd(text, 1);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        expect(root.querySelector('blockquote')).not.toBeNull();

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts - to unordered list', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin, markdownShortcutsPlugin] });

        editor.setHTML('<p>-</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 1);
        range.setEnd(text, 1);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        expect(root.querySelector('ul')).not.toBeNull();
        expect(root.querySelector('li')).not.toBeNull();

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts **text** to bold', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>**bold**</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 8);
        range.setEnd(text, 8);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        const strong = root.querySelector('strong');
        expect(strong).not.toBeNull();
        expect(strong?.textContent).toBe('bold');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts *text* to italic', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>hello *italic*</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 14);
        range.setEnd(text, 14);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        const em = root.querySelector('em');
        expect(em).not.toBeNull();
        expect(em?.textContent).toBe('italic');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts `code` to inline code', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>`code`</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 6);
        range.setEnd(text, 6);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        const code = root.querySelector('code');
        expect(code).not.toBeNull();
        expect(code?.textContent).toBe('code');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts ~~text~~ to strikethrough', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>~~strike~~</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 10);
        range.setEnd(text, 10);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        const strike = root.querySelector('s');
        expect(strike).not.toBeNull();
        expect(strike?.textContent).toBe('strike');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts --- to horizontal rule on space', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>---</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 3);
        range.setEnd(text, 3);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        expect(root.querySelector('hr')).not.toBeNull();
        expect(root.querySelectorAll('p').length).toBe(1);

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts --- to horizontal rule on enter', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [markdownShortcutsPlugin] });

        editor.setHTML('<p>---</p>');
        const p = root.querySelector('p')!;
        const text = p.firstChild as Text;

        const range = document.createRange();
        range.setStart(text, 3);
        range.setEnd(text, 3);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        expect(root.querySelector('hr')).not.toBeNull();

        document.body.removeChild(root);
        editor.destroy();
    });

    it('keeps caret in the new ordered list item when "1." is typed on an empty line below content', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, {
            shortcuts: false,
            plugins: [listPlugin, markdownShortcutsPlugin]
        });

        editor.setHTML('<p>first</p><p>1.</p>');

        const secondP = root.children[1] as HTMLElement;
        const text = secondP.firstChild as Text;
        const range = document.createRange();
        range.setStart(text, 2);
        range.setEnd(text, 2);
        editor.setSelection(range);

        const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
        root.dispatchEvent(event);

        const ol = root.querySelector('ol');
        expect(ol).not.toBeNull();
        const li = ol!.querySelector('li')!;

        const caretRange = editor.getRange();
        let node: Node | null = caretRange.startContainer;
        let caretLi: HTMLElement | null = null;
        while (node && node !== root) {
            if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'LI') {
                caretLi = node as HTMLElement;
                break;
            }
            node = node.parentNode;
        }

        expect(caretRange.collapsed).toBe(true);
        expect(caretLi).toBe(li);
        expect(root.querySelector('p')?.textContent).toBe('first');

        document.body.removeChild(root);
        editor.destroy();
    });
});
