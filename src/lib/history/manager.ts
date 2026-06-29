import { applyActions } from './apply.js';
import { buildHistoryStep, captureEditableSnapshot, squashSteps } from './capture.js';
import { compressStep, decompressStep, persistStack, restoreStack, clearPersistedStack } from './compress.js';
import { restoreSelection } from './selection.js';
import { validateEditableIntegrity } from './validate.js';
import type { Editor } from '../core/editor.js';
import type {
	CompositeStep,
	EditableSnapshot,
	HistoryMode,
	HistoryPluginConfig,
	HistorySource,
	HistoryStep,
	SelectionOffsets,
	StackEntry,
	Action
} from './types.js';
import { DEFAULT_HISTORY_CONFIG, isCompositeStep } from './types.js';

type PendingGroup = {
	steps: HistoryStep[];
	selectionBefore: SelectionOffsets;
	selectionAfter: SelectionOffsets;
	source: HistorySource;
};

export class HistoryManager {
	private undoStack: StackEntry[] = [];
	private redoStack: StackEntry[] = [];
	private pending: PendingGroup | null = null;
	private mergeTimer: ReturnType<typeof setTimeout> | null = null;
	private suspended = false;
	private isApplying = false;
	private batchDepth = 0;
	private batchSteps: HistoryStep[] = [];
	private lastSnapshot: EditableSnapshot | null = null;
	private lastHtml = '';
	private floorText = '';

	constructor(
		private editor: Editor,
		private config: HistoryPluginConfig = DEFAULT_HISTORY_CONFIG
	) {
		if (config.persist) {
			const restored = restoreStack();
			if (restored) {
				this.undoStack = restored.undoStack.map((entry) => this.decompressEntry(entry));
				this.redoStack = restored.redoStack.map((entry) => this.decompressEntry(entry));
			}
		}
		this.lastSnapshot = captureEditableSnapshot(
			editor.root,
			editor.getSelectionOffsets() ?? { start: 0, end: 0 }
		);
		this.lastHtml = editor.getHTML();
		this.floorText = this.lastSnapshot.text;
	}

	destroy(): void {
		if (this.mergeTimer) clearTimeout(this.mergeTimer);
	}

	get canUndo(): boolean {
		return this.pending !== null || this.undoStack.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	get stackDepth(): number {
		return this.undoStack.length + (this.pending ? 1 : 0);
	}

	getLastHtml(): string {
		return this.lastHtml;
	}

	suspend(): void {
		this.suspended = true;
	}

	resume(): void {
		this.suspended = false;
	}

	clear(): void {
		this.undoStack = [];
		this.redoStack = [];
		this.pending = null;
		if (this.mergeTimer) clearTimeout(this.mergeTimer);
		this.mergeTimer = null;
		clearPersistedStack();
		this.lastSnapshot = captureEditableSnapshot(
			this.editor.root,
			this.editor.getSelectionOffsets() ?? { start: 0, end: 0 }
		);
		this.lastHtml = this.editor.getHTML();
		this.floorText = this.lastSnapshot.text;
	}

	beginBatch(): void {
		this.batchDepth += 1;
	}

	endBatch(): void {
		if (this.batchDepth <= 0) return;
		this.batchDepth -= 1;
		if (this.batchDepth === 0 && this.batchSteps.length > 0) {
			const squashed = squashSteps(this.batchSteps);
			this.batchSteps = [];
			if (squashed) {
				this.commitStep(squashed, 'batch', true);
			}
		}
	}

	pushActions(actions: Action[]): void {
		if (!this.editor.historyContext) return;
		this.editor.historyContext.transactionActions.push(...actions);
	}

	updatePendingSelection(selection: SelectionOffsets): void {
		if (this.pending) {
			this.pending.selectionAfter = selection;
		}
	}

	handleTransactionEnd(input: {
		beforeSnapshot: EditableSnapshot;
		afterSnapshot: EditableSnapshot;
		beforeHtml: string;
		afterHtml: string;
		actions: Action[];
		historyMode: HistoryMode;
		isComposing: boolean;
	}): void {
		if (this.suspended || this.isApplying || input.historyMode === 'skip') {
			this.lastSnapshot = input.afterSnapshot;
			return;
		}

		if (input.isComposing) {
			this.lastSnapshot = input.afterSnapshot;
			return;
		}

		const step = buildHistoryStep({
			before: input.beforeSnapshot,
			after: input.afterSnapshot,
			beforeHtml: input.beforeHtml,
			afterHtml: input.afterHtml,
			actions: input.actions,
			selectionBefore: input.beforeSnapshot.selection,
			selectionAfter: input.afterSnapshot.selection,
			source: 'command',
			preferActions: this.config.preferActions
		});

		this.lastSnapshot = input.afterSnapshot;

		this.lastSnapshot = input.afterSnapshot;
		this.lastHtml = input.afterHtml;
		if (!step) return;

		const immediate = input.historyMode === 'group';
		this.recordStep(step, immediate);
	}

	handleContentChange(html: string): void {
		if (this.suspended || this.isApplying) return;

		const selection = this.editor.getSelectionOffsets() ?? { start: 0, end: 0 };
		const afterSnapshot = captureEditableSnapshot(this.editor.root, selection);
		const beforeSnapshot =
			this.lastSnapshot ??
			captureEditableSnapshot(this.editor.root, selection);
		const beforeHtml = this.lastHtml;

		if (beforeSnapshot.text === afterSnapshot.text && html === beforeHtml) {
			this.lastSnapshot = afterSnapshot;
			return;
		}

		const step = buildHistoryStep({
			before: beforeSnapshot,
			after: afterSnapshot,
			beforeHtml,
			afterHtml: html,
			actions: [],
			selectionBefore: beforeSnapshot.selection,
			selectionAfter: afterSnapshot.selection,
			source: 'typing',
			preferActions: this.config.preferActions
		});

		this.lastSnapshot = afterSnapshot;
		this.lastHtml = html;
		if (!step) return;

		this.recordStep(step, false);
	}

	private recordStep(step: HistoryStep, immediate: boolean): void {
		if (this.batchDepth > 0) {
			this.batchSteps.push(step);
			return;
		}

		if (immediate) {
			this.flushPending();
			this.commitStep(step, step.source, true);
			return;
		}

		if (!this.pending) {
			this.pending = {
				steps: [step],
				selectionBefore: step.selectionBefore,
				selectionAfter: step.selectionAfter,
				source: step.source
			};
		} else {
			this.pending.steps.push(step);
			this.pending.selectionAfter = step.selectionAfter;
		}

		this.scheduleMerge();
	}

	private scheduleMerge(): void {
		if (this.mergeTimer) clearTimeout(this.mergeTimer);
		this.mergeTimer = setTimeout(() => this.flushPending(), this.config.mergeMs);
	}

	flushPending(): void {
		if (!this.pending) return;
		const squashed = squashSteps(this.pending.steps);
		this.pending = null;
		if (this.mergeTimer) {
			clearTimeout(this.mergeTimer);
			this.mergeTimer = null;
		}
		if (squashed) {
			this.commitStep(squashed, squashed.source, true);
		}
	}

	private commitStep(step: HistoryStep, _source: HistorySource, clearRedo: boolean): void {
		const stored = compressStep(step, this.config.compressThresholdBytes, this.config.compress);
		this.undoStack.push(stored);
		if (clearRedo) {
			this.redoStack = [];
		}
		this.evictIfNeeded();
		if (this.config.persist) {
			persistStack(this.undoStack, this.redoStack);
		}
	}

	private evictIfNeeded(): void {
		while (this.undoStack.length > this.config.maxSteps) {
			const evicted = this.undoStack.shift();
			if (evicted) {
				this.applyForwardToFloor(evicted);
			}
		}
	}

	private applyForwardToFloor(entry: StackEntry): void {
		const step = isCompositeStep(entry) ? squashSteps(entry.steps) : entry;
		if (!step) return;
		// Track floor text for diagnostics; absolute offsets apply to live DOM
		if (step.actions) {
			// floor text updated conceptually when oldest step is no longer undoable
			this.floorText = extractFloorText(step);
		}
	}

	private decompressEntry(entry: StackEntry): StackEntry {
		if (isCompositeStep(entry)) {
			return {
				...entry,
				steps: entry.steps.map((s) => decompressStep(s))
			};
		}
		return decompressStep(entry);
	}

	undo(): void {
		if (this.pending && this.pending.steps.length > 0) {
			const lastMicro = this.pending.steps.pop()!;
			if (this.pending.steps.length === 0) {
				this.pending = null;
				if (this.mergeTimer) {
					clearTimeout(this.mergeTimer);
					this.mergeTimer = null;
				}
			} else {
				this.pending.selectionAfter =
					this.pending.steps[this.pending.steps.length - 1].selectionAfter;
			}
			this.applyUndoStep(lastMicro);
			this.redoStack.push(lastMicro);
			if (this.config.persist) {
				persistStack(this.undoStack, this.redoStack);
			}
			return;
		}

		const entry = this.undoStack.pop();
		if (!entry) return;

		const step = isCompositeStep(entry) ? squashSteps(entry.steps) : entry;
		if (!step) return;

		this.applyUndoStep(step);
		this.redoStack.push(entry);
		if (this.config.persist) {
			persistStack(this.undoStack, this.redoStack);
		}
	}

	redo(): void {
		const entry = this.redoStack.pop();
		if (!entry) return;

		if (!isCompositeStep(entry) && this.pending) {
			this.pending.steps.push(entry);
			this.pending.selectionAfter = entry.selectionAfter;
			this.scheduleMerge();
			this.applyRedoStep(entry);
			return;
		}

		const step = isCompositeStep(entry) ? squashSteps(entry.steps) : entry;
		if (!step) return;

		this.applyRedoStep(step);
		this.undoStack.push(entry);
		if (this.config.persist) {
			persistStack(this.undoStack, this.redoStack);
		}
	}

	private applyUndoStep(step: HistoryStep): void {
		this.isApplying = true;
		this.editor.runTransaction(
			() => {
				if (step.inverse?.length) {
					applyActions(this.editor, step.inverse);
				}
				restoreSelection(this.editor, step.selectionBefore);
				validateEditableIntegrity(this.editor, this.config);
			},
			{ history: 'skip', preferredSelection: step.selectionBefore }
		);
		this.isApplying = false;
		this.lastSnapshot = captureEditableSnapshot(this.editor.root, step.selectionBefore);
		this.lastHtml = this.editor.getHTML();
	}

	private applyRedoStep(step: HistoryStep): void {
		this.isApplying = true;
		this.editor.runTransaction(
			() => {
				if (step.actions?.length) {
					applyActions(this.editor, step.actions);
				}
				restoreSelection(this.editor, step.selectionAfter);
				validateEditableIntegrity(this.editor, this.config);
			},
			{ history: 'skip', preferredSelection: step.selectionAfter }
		);
		this.isApplying = false;
		this.lastSnapshot = captureEditableSnapshot(this.editor.root, step.selectionAfter);
		this.lastHtml = this.editor.getHTML();
	}

	onBlur(): void {
		this.flushPending();
	}

	onCompositionEnd(): void {
		this.flushPending();
	}
}

function extractFloorText(step: HistoryStep): string {
	if (step.diff?.kind === 'text') {
		return step.diff.insertText;
	}
	return '';
}
