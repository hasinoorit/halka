import type { Editor, HalkaPlugin, CommandHandler } from '../core/editor.js';

interface HistoryState {
    html: string;
    selection: { start: number; end: number } | undefined;
    timestamp: number;
}

interface HistoryEntry {
    from: HistoryState;
    to: HistoryState;
}

const MERGE_THRESHOLD = 60000; // 1 minute in milliseconds

export const historyPlugin: HalkaPlugin = (editor: Editor) => {
    const committedStack: HistoryEntry[] = [];
    let uncommittedStack: HistoryEntry[] = [];
    let redoStack: HistoryEntry[] = [];
    let isApplying = false;

    let lastState: HistoryState = {
        html: editor.getHTML(),
        selection: editor.getSelectionOffsets(),
        timestamp: Date.now()
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mergeTimer: any = null;

    const commitUncommitted = () => {
        if (uncommittedStack.length === 0) return;

        // Squash all uncommitted entries into one
        const first = uncommittedStack[0];
        const last = uncommittedStack[uncommittedStack.length - 1];

        committedStack.push({
            from: first.from,
            to: last.to
        });

        uncommittedStack = [];
        if (mergeTimer) {
            clearTimeout(mergeTimer);
            mergeTimer = null;
        }
    };

    const startMergeTimer = () => {
        if (mergeTimer) clearTimeout(mergeTimer);
        mergeTimer = setTimeout(commitUncommitted, MERGE_THRESHOLD);
    };

    const recordChange = () => {
        if (isApplying) return;

        const currentState: HistoryState = {
            html: editor.getHTML(),
            selection: editor.getSelectionOffsets(),
            timestamp: Date.now()
        };

        if (currentState.html === lastState.html) {
            return;
        }

        const entry: HistoryEntry = {
            from: lastState,
            to: currentState
        };

        uncommittedStack.push(entry);
        redoStack = []; // Clear redo on new change
        lastState = currentState;

        startMergeTimer();
    };

    const handleSelectionChange = () => {
        if (isApplying) return;
        lastState.selection = editor.getSelectionOffsets();
    };

    const undo = () => {
        let entry: HistoryEntry | undefined;

        if (uncommittedStack.length > 0) {
            entry = uncommittedStack.pop();
        } else if (committedStack.length > 0) {
            entry = committedStack.pop();
        }

        if (!entry) return;

        redoStack.push(entry);

        isApplying = true;
        editor.runTransaction((ed) => {
            ed.setHTML(entry!.from.html);
            if (entry!.from.selection) {
                ed.setSelectionOffsets(entry!.from.selection);
                // Force the live selection to reflect the restored offsets so the
                // transaction's selection reconciliation keeps it.
                ed.applySelection(true);
            }
        });
        isApplying = false;

        lastState = entry.from;
    };

    const redo = () => {
        const entry = redoStack.pop();
        if (!entry) return;

        uncommittedStack.push(entry);

        isApplying = true;
        editor.runTransaction((ed) => {
            ed.setHTML(entry!.to.html);
            if (entry!.to.selection) {
                ed.setSelectionOffsets(entry!.to.selection);
                // Force the live selection to reflect the restored offsets so the
                // transaction's selection reconciliation keeps it.
                ed.applySelection(true);
            }
        });
        isApplying = false;

        lastState = entry.to;
    };

    const handleUndo: CommandHandler = () => undo();
    const handleRedo: CommandHandler = () => redo();

    editor.on('change', recordChange);
    editor.window.document.addEventListener('selectionchange', handleSelectionChange);
    editor.registerCommand('history.undo', handleUndo);
    editor.registerCommand('history.redo', handleRedo);

    editor.onShortcut('mod+z', (e) => {
        e.preventDefault();
        undo();
    });

    editor.onShortcut('mod+shift+z', (e) => {
        e.preventDefault();
        redo();
    });

    editor.onShortcut('mod+y', (e) => {
        e.preventDefault();
        redo();
    });

    return () => {
        if (mergeTimer) clearTimeout(mergeTimer);
        editor.off('change', recordChange);
        editor.window.document.removeEventListener('selectionchange', handleSelectionChange);
        editor.unregisterCommand('history.undo', handleUndo);
        editor.unregisterCommand('history.redo', handleRedo);
    };
};
