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
});
