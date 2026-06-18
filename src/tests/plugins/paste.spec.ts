import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { pastePlugin } from '../../lib/plugins/paste.js';

const createRoot = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    return root;
};

const createPasteEvent = (html: string, text: string) => {
    const event = new Event('paste', { bubbles: true, cancelable: true }) as any;
    event.clipboardData = {
        getData: (type: string) => (type === 'text/html' ? html : text)
    };
    return event;
};

describe('pastePlugin', () => {
    it('sanitizes pasted HTML and enforces block model', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin] });

        editor.setHTML(''); // Results in <p><br></p>

        // Select all to overwrite
        const range = document.createRange();
        range.selectNodeContents(root);
        editor.setSelection(range);

        // Paste some dirty HTML
        const dirtyHTML = '<div><script>alert(1)</script><b>Bold</b> and <i>Italic</i><section>Section content</section></div>';
        const event = createPasteEvent(dirtyHTML, 'Bold and Italic Section content');

        root.dispatchEvent(event);

        const html = editor.getHTML();
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('alert(1)');
        expect(html).not.toContain('<section>');
        expect(html).toContain('<b>Bold</b>');
        expect(html).toContain('<i>Italic</i>');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('wraps top-level text and inlines in paragraphs', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin] });

        editor.setHTML('');
        const range = document.createRange();
        range.selectNodeContents(root);
        editor.setSelection(range);

        const dirtyHTML = 'Just some text <span>and a span</span>';
        const event = createPasteEvent(dirtyHTML, 'Just some text and a span');

        root.dispatchEvent(event);

        const html = editor.getHTML();
        expect(html).toBe('<p>Just some text <span>and a span</span></p>');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('handles plain text by splitting into paragraphs', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin] });

        editor.setHTML('');
        const range = document.createRange();
        range.selectNodeContents(root);
        editor.setSelection(range);

        const text = 'Line 1\n\nLine 2';
        const event = createPasteEvent('', text);

        root.dispatchEvent(event);

        const html = editor.getHTML();
        expect(html).toContain('<p>Line 1</p>');
        expect(html).toContain('<p>Line 2</p>');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('removes empty paragraphs after sanitization', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin] });

        editor.setHTML('');
        const range = document.createRange();
        range.selectNodeContents(root);
        editor.setSelection(range);

        const dirtyHTML = '<p></p><p>Content</p><p>  </p>';
        const event = createPasteEvent(dirtyHTML, 'Content');

        root.dispatchEvent(event);

        const html = editor.getHTML();
        expect(html).toBe('<p>Content</p>');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts pasted markdown plain text into HTML', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin] });

        editor.setHTML('');
        const range = document.createRange();
        range.selectNodeContents(root);
        editor.setSelection(range);

        const markdown = '# Heading\n\n**bold** and *italic*\n\n- item one\n- item two';
        const event = createPasteEvent('', markdown);

        root.dispatchEvent(event);

        const html = editor.getHTML();
        expect(html).toContain('<h1>Heading</h1>');
        expect(html).toContain('<strong>bold</strong>');
        expect(html).toContain('<em>italic</em>');
        expect(html).toContain('<ul>');
        expect(html).toContain('<li>item one</li>');
        expect(html).toContain('<li>item two</li>');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('replaces empty block when pasting markdown with cursor inside it', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin] });

        editor.setHTML('');
        const paragraph = root.querySelector('p')!;
        const range = document.createRange();
        range.setStart(paragraph, 0);
        range.collapse(true);
        editor.setSelection(range);

        const markdown = '# Heading\n\n**bold**';
        const event = createPasteEvent('', markdown);
        root.dispatchEvent(event);

        const html = editor.getHTML();
        expect(html).toBe('<h1>Heading</h1><p><strong>bold</strong></p>');
        expect(html).not.toMatch(/^<p><br><\/p>/);
        expect(html).not.toMatch(/^<p><\/p>/);
        expect(html).not.toMatch(/^<p>\s*<h1>/);

        document.body.removeChild(root);
        editor.destroy();
    });

    it('converts pasted horizontal rules', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [pastePlugin] });

        editor.setHTML('');
        const range = document.createRange();
        range.selectNodeContents(root);
        editor.setSelection(range);

        const event = createPasteEvent('', 'Above\n\n---\n\nBelow');
        root.dispatchEvent(event);

        const html = editor.getHTML();
        expect(html).toContain('<hr>');
        expect(html).toContain('Above');
        expect(html).toContain('Below');

        document.body.removeChild(root);
        editor.destroy();
    });
});
