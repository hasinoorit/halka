export type SelectionOffsets = { start: number; end: number };

export type HistoryMode = 'skip' | 'group' | 'record';

export type HistorySource = 'typing' | 'paste' | 'command' | 'batch';

export type EditableSnapshot = {
	text: string;
	selection: SelectionOffsets;
};

export type InsertTextAction = { type: 'insertText'; offset: number; text: string };
export type DeleteRangeAction = {
	type: 'deleteRange';
	start: number;
	end: number;
	text: string;
};
export type InsertFragmentAction = { type: 'insertFragment'; offset: number; html: string };
export type ReplaceRangeAction = {
	type: 'replaceRange';
	start: number;
	end: number;
	html: string;
	previousHtml: string;
};
export type SetSelectionAction = { type: 'setSelection'; start: number; end: number };
export type WrapRangeAction = { type: 'wrap'; start: number; end: number; tag: string };
export type UnwrapRangeAction = { type: 'unwrap'; start: number; end: number; tag: string };
export type SplitBlockAction = { type: 'splitBlock'; offset: number };
export type JoinBlocksAction = { type: 'joinBlocks'; offset: number };
export type InsertTableAction = {
	type: 'insertTable';
	offset: number;
	rows: number;
	cols: number;
};
export type InsertNodeAction = {
	type: 'insertNode';
	parentPath: number[];
	index: number;
	html: string;
};
export type RemoveNodeAction = { type: 'removeNode'; path: number[]; html: string };

export type Action =
	| InsertTextAction
	| DeleteRangeAction
	| InsertFragmentAction
	| ReplaceRangeAction
	| SetSelectionAction
	| WrapRangeAction
	| UnwrapRangeAction
	| SplitBlockAction
	| JoinBlocksAction
	| InsertTableAction
	| InsertNodeAction
	| RemoveNodeAction;

export type TextPatchDiff = {
	kind: 'text';
	start: number;
	deleteCount: number;
	insertText: string;
	deletedText: string;
};

export type HtmlInsertDiff = { kind: 'html-insert'; offset: number; html: string };
export type HtmlReplaceDiff = {
	kind: 'html-replace';
	start: number;
	end: number;
	html: string;
	previousHtml: string;
};
export type CompositeDiff = { kind: 'composite'; ops: Diff[] };

export type Diff = TextPatchDiff | HtmlInsertDiff | HtmlReplaceDiff | CompositeDiff;

export type HistoryStep = {
	id: string;
	actions?: Action[];
	diff?: Diff;
	inverse?: Action[];
	selectionBefore: SelectionOffsets;
	selectionAfter: SelectionOffsets;
	source: HistorySource;
};

export type CompositeStep = {
	kind: 'composite';
	steps: HistoryStep[];
	selectionBefore: SelectionOffsets;
	selectionAfter: SelectionOffsets;
	source: HistorySource;
};

export type StackEntry = HistoryStep | CompositeStep;

export function isCompositeStep(entry: StackEntry): entry is CompositeStep {
	return 'kind' in entry && entry.kind === 'composite';
}

export type HistoryPluginConfig = {
	maxSteps: number;
	mergeMs: number;
	preferActions: boolean;
	compress: boolean;
	compressThresholdBytes: number;
	persist: boolean;
	strictApply: boolean;
};

export const DEFAULT_HISTORY_CONFIG: HistoryPluginConfig = {
	maxSteps: 100,
	mergeMs: 5000,
	preferActions: true,
	compress: false,
	compressThresholdBytes: 8_192,
	persist: false,
	strictApply: true
};

export type TransactionMeta = {
	history?: HistoryMode;
	preferredSelection?: SelectionOffsets;
};

export type InsertContentOptions = {
	range?: Range;
	history?: HistoryMode;
};

export type ChangeEventDetail = {
	html: string;
	phase: 'before' | 'after';
	snapshot?: EditableSnapshot;
	beforeSnapshot?: EditableSnapshot;
	transactionActions?: Action[];
	historyMode?: HistoryMode;
	preferredSelection?: SelectionOffsets;
};
