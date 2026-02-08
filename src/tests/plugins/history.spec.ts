import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { historyPlugin } from '../../lib/plugins/history.js';

const createRoot = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    return root;
};

describe('historyPlugin', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('records and undoes changes', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [historyPlugin] });

        editor.setHTML('<p>First state</p>');
        editor.setHTML('<p>Second state</p>');

        expect(editor.getHTML()).toBe('<p>Second state</p>');

        editor.execCommand('history.undo');
        expect(editor.getHTML()).toBe('<p>First state</p>');

        editor.execCommand('history.redo');
        expect(editor.getHTML()).toBe('<p>Second state</p>');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('restores selection after undo', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [historyPlugin] });

        editor.setHTML('<p>First</p>');

        // Mock selection by actually setting a range
        const p1 = root.querySelector('p')!;
        const text1 = p1.firstChild as Text;
        const range1 = document.createRange();
        range1.setStart(text1, 1);
        range1.setEnd(text1, 3);
        editor.setSelection(range1);
        document.dispatchEvent(new Event('selectionchange'));

        editor.setHTML('<p>Second</p>');
        const p2 = root.querySelector('p')!;
        const text2 = p2.firstChild as Text;
        const range2 = document.createRange();
        range2.setStart(text2, 2);
        range2.setEnd(text2, 4);
        editor.setSelection(range2);
        document.dispatchEvent(new Event('selectionchange'));

        editor.execCommand('history.undo');
        const finalOffsets = editor.getSelectionOffsets();
        expect(finalOffsets).toEqual({ start: 1, end: 3 });

        document.body.removeChild(root);
        editor.destroy();
    });

    it('squashes uncommitted changes after threshold', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [historyPlugin] });

        // Step 1: Base state
        editor.setHTML('<p>Base</p>');
        // Step 2: Advanced time to commit the base state
        vi.advanceTimersByTime(61000);

        // Step 3: Uncommitted changes
        editor.setHTML('<p>Change 1</p>');
        editor.setHTML('<p>Change 2</p>');
        editor.setHTML('<p>Change 3</p>');

        // Step 4: Move time forward by 61 seconds to squash changes 1, 2, 3
        vi.advanceTimersByTime(61000);

        // Undo should go back to "Base" in ONE step
        editor.execCommand('history.undo');
        expect(editor.getHTML()).toBe('<p>Base</p>');

        document.body.removeChild(root);
        editor.destroy();
    });

    it('works with multiple uncommitted changes before squashing', () => {
        const root = createRoot();
        const editor = new HalkaEditor(root, { shortcuts: false, plugins: [historyPlugin] });

        editor.setHTML('<p>Base</p>');

        editor.setHTML('<p>Change 1</p>');
        editor.setHTML('<p>Change 2</p>');

        // No time advance yet. Both should be in uncommitted stack.

        editor.execCommand('history.undo');
        expect(editor.getHTML()).toBe('<p>Change 1</p>');

        editor.execCommand('history.undo');
        expect(editor.getHTML()).toBe('<p>Base</p>');

        document.body.removeChild(root);
        editor.destroy();
    });
});
