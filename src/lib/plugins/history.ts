import type { Editor, HalkaPlugin, CommandHandler } from '../core/editor.js';
import { getChangeHtml } from '../core/editor.js';
import type { ChangeEventDetail, HistoryPluginConfig } from '../history/types.js';
import { DEFAULT_HISTORY_CONFIG } from '../history/types.js';
import { HistoryManager } from '../history/manager.js';

export type { HistoryPluginConfig } from '../history/types.js';

export function createHistoryPlugin(config: Partial<HistoryPluginConfig> = {}): HalkaPlugin {
	const resolvedConfig: HistoryPluginConfig = { ...DEFAULT_HISTORY_CONFIG, ...config };

	return (editor: Editor) => {
		const manager = new HistoryManager(editor, resolvedConfig);

		const handleChange = (data?: string | ChangeEventDetail) => {
			if (!data) return;

			if (typeof data !== 'string' && data.phase === 'before') {
				return;
			}

			if (typeof data !== 'string' && data.phase === 'after' && data.beforeSnapshot && data.snapshot) {
				manager.handleTransactionEnd({
					beforeSnapshot: data.beforeSnapshot,
					afterSnapshot: data.snapshot,
					beforeHtml: manager.getLastHtml(),
					afterHtml: data.html,
					actions: data.transactionActions ?? [],
					historyMode: data.historyMode ?? 'record',
					isComposing: editor.isComposing
				});
				return;
			}

			const html = getChangeHtml(data);
			manager.handleContentChange(html);
		};

		const handleSelectionChange = () => {
			const offsets = editor.getSelectionOffsets();
			if (offsets) {
				manager.updatePendingSelection(offsets);
			}
		};

		const handleBlur = () => {
			manager.onBlur();
		};

		const handleCompositionEnd = () => {
			manager.onCompositionEnd();
		};

		const undo: CommandHandler = () => manager.undo();
		const redo: CommandHandler = () => manager.redo();
		const clear: CommandHandler = () => manager.clear();
		const suspend: CommandHandler = () => manager.suspend();
		const resume: CommandHandler = () => manager.resume();
		const beginBatch: CommandHandler = () => manager.beginBatch();
		const endBatch: CommandHandler = () => manager.endBatch();

		const canUndoState = () => manager.canUndo;
		const canRedoState = () => manager.canRedo;
		const stackDepthState = () => manager.stackDepth;

		editor.on('change', handleChange);
		editor.window.document.addEventListener('selectionchange', handleSelectionChange);
		editor.root.addEventListener('blur', handleBlur);
		editor.on('compositionend', handleCompositionEnd);

		editor.registerCommand('history.undo', undo);
		editor.registerCommand('history.redo', redo);
		editor.registerCommand('history.clear', clear);
		editor.registerCommand('history.suspend', suspend);
		editor.registerCommand('history.resume', resume);
		editor.registerCommand('history.beginBatch', beginBatch);
		editor.registerCommand('history.endBatch', endBatch);

		editor.registerState('history.canUndo', canUndoState);
		editor.registerState('history.canRedo', canRedoState);
		editor.registerState('history.stackDepth', stackDepthState);

		editor.onShortcut('mod+z', (e) => {
			e.preventDefault();
			manager.undo();
		});

		editor.onShortcut('mod+shift+z', (e) => {
			e.preventDefault();
			manager.redo();
		});

		editor.onShortcut('mod+y', (e) => {
			e.preventDefault();
			manager.redo();
		});

		const originalPush = editor.pushHistoryActions.bind(editor);
		editor.pushHistoryActions = (actions) => {
			manager.pushActions(actions);
			originalPush(actions);
		};

		return () => {
			manager.destroy();
			editor.off('change', handleChange);
			editor.window.document.removeEventListener('selectionchange', handleSelectionChange);
			editor.root.removeEventListener('blur', handleBlur);
			editor.off('compositionend', handleCompositionEnd);
			editor.unregisterCommand('history.undo', undo);
			editor.unregisterCommand('history.redo', redo);
			editor.unregisterCommand('history.clear', clear);
			editor.unregisterCommand('history.suspend', suspend);
			editor.unregisterCommand('history.resume', resume);
			editor.unregisterCommand('history.beginBatch', beginBatch);
			editor.unregisterCommand('history.endBatch', endBatch);
			editor.unregisterState('history.canUndo', canUndoState);
			editor.unregisterState('history.canRedo', canRedoState);
			editor.unregisterState('history.stackDepth', stackDepthState);
		};
	};
}

export const historyPlugin = createHistoryPlugin();
