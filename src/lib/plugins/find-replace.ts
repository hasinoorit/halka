import type { Editor, HalkaPlugin, CommandHandler } from '../core/editor.js';
import { Range as RangeHelpers } from '../helpers/index.js';
import {
	collectEditableText,
	findMatchIndexAtOrAfter,
	findNextMatchIndex,
	findPreviousMatchIndex,
	findTextMatches,
	type TextMatch
} from '../helpers/text-search.js';

export type FindReplaceOptions = {
	query?: string;
	replacement?: string;
	caseSensitive?: boolean;
	wholeWord?: boolean;
};

export type FindReplaceState = {
	isOpen: boolean;
	query: string;
	replacement: string;
	caseSensitive: boolean;
	wholeWord: boolean;
	matchCount: number;
	currentIndex: number;
	currentMatch: TextMatch | null;
};

declare module '../core/editor.js' {
	interface EditorCommandMap {
		'findReplace.open': FindReplaceOptions | void;
		'findReplace.close': void;
		'findReplace.setOptions': FindReplaceOptions;
		'findReplace.find': void;
		'findReplace.findNext': void;
		'findReplace.findPrevious': void;
		'findReplace.replace': void;
		'findReplace.replaceAll': void;
	}
	interface EditorStateMap {
		'findReplace.state': FindReplaceState;
	}
	interface EditorStatePayloadMap {
		'findReplace.state': never;
	}
}

type Session = {
	isOpen: boolean;
	query: string;
	replacement: string;
	caseSensitive: boolean;
	wholeWord: boolean;
	matches: TextMatch[];
	currentIndex: number;
};

const sessions = new WeakMap<Editor, Session>();

function getSession(editor: Editor): Session {
	let session = sessions.get(editor);
	if (!session) {
		session = {
			isOpen: false,
			query: '',
			replacement: '',
			caseSensitive: false,
			wholeWord: false,
			matches: [],
			currentIndex: -1
		};
		sessions.set(editor, session);
	}
	return session;
}

function getState(editor: Editor): FindReplaceState {
	const session = getSession(editor);
	return {
		isOpen: session.isOpen,
		query: session.query,
		replacement: session.replacement,
		caseSensitive: session.caseSensitive,
		wholeWord: session.wholeWord,
		matchCount: session.matches.length,
		currentIndex: session.currentIndex,
		currentMatch:
			session.currentIndex >= 0 ? session.matches[session.currentIndex] ?? null : null
	};
}

function refreshMatches(editor: Editor): void {
	const session = getSession(editor);
	const text = collectEditableText(editor.root);
	session.matches = findTextMatches(text, session.query, {
		caseSensitive: session.caseSensitive,
		wholeWord: session.wholeWord
	});

	if (session.currentIndex >= session.matches.length) {
		session.currentIndex = session.matches.length > 0 ? session.matches.length - 1 : -1;
	}
}

function getCursorOffset(editor: Editor): number {
	const offsets = editor.getSelectionOffsets();
	if (offsets) return offsets.start;

	const range = editor.getRange();
	const computed = editor.computeSelectionOffsets(range);
	return computed?.start ?? 0;
}

const FIND_HIGHLIGHT_NAME = 'halka-find-active';

function supportsCssHighlight(): boolean {
	return (
		typeof CSS !== 'undefined' &&
		'highlights' in CSS &&
		typeof Highlight !== 'undefined'
	);
}

function clearFindHighlight(): void {
	if (supportsCssHighlight()) {
		CSS.highlights.delete(FIND_HIGHLIGHT_NAME);
	}
}

function applyFindHighlight(range: Range): void {
	if (!supportsCssHighlight()) return;
	CSS.highlights.set(FIND_HIGHLIGHT_NAME, new Highlight(range));
}

function scrollMatchIntoView(editor: Editor): void {
	const range = editor.getRange();
	if (!editor.root.contains(range.commonAncestorContainer)) return;

	const node = range.startContainer;
	const element =
		node.nodeType === Node.TEXT_NODE
			? (node.parentElement as HTMLElement | null)
			: (node as HTMLElement);

	element?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
}

function selectMatch(editor: Editor, match: TextMatch): void {
	const selection = editor.getSelection();
	if (!selection) return;

	RangeHelpers.restoreSelectionByOffsets(selection, editor.root, match.start, match.end);
	scrollMatchIntoView(editor);

	if (selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	if (supportsCssHighlight()) {
		clearFindHighlight();
		applyFindHighlight(range);
		return;
	}

	editor.root.focus({ preventScroll: true });
}

function selectMatchAtIndex(editor: Editor, index: number): void {
	const session = getSession(editor);
	if (index < 0 || index >= session.matches.length) {
		session.currentIndex = -1;
		clearFindHighlight();
		return;
	}

	session.currentIndex = index;
	selectMatch(editor, session.matches[index]);
}

function replaceMatchAt(editor: Editor, match: TextMatch, replacement: string): void {
	clearFindHighlight();
	editor.runTransaction(() => {
		selectMatch(editor, match);
		const range = editor.getRange();
		range.deleteContents();

		if (replacement) {
			const textNode = editor.createText(replacement);
			range.insertNode(textNode);
			editor.selection.setCursorAfter(textNode);
		} else {
			range.collapse(true);
			editor.setSelection(range);
		}
	});
}

function applyOptions(editor: Editor, options: FindReplaceOptions = {}): void {
	const session = getSession(editor);
	const searchChanged =
		(options.query !== undefined && options.query !== session.query) ||
		(options.caseSensitive !== undefined && options.caseSensitive !== session.caseSensitive) ||
		(options.wholeWord !== undefined && options.wholeWord !== session.wholeWord);

	if (options.query !== undefined) session.query = options.query;
	if (options.replacement !== undefined) session.replacement = options.replacement;
	if (options.caseSensitive !== undefined) session.caseSensitive = options.caseSensitive;
	if (options.wholeWord !== undefined) session.wholeWord = options.wholeWord;

	refreshMatches(editor);

	if (searchChanged) {
		session.currentIndex = -1;
		clearFindHighlight();
	}
}

export const findReplacePlugin: HalkaPlugin = (editor: Editor) => {
	const open = (options?: FindReplaceOptions) => {
		const session = getSession(editor);
		session.isOpen = true;
		applyOptions(editor, options);
	};

	const close = () => {
		const session = getSession(editor);
		session.isOpen = false;
		session.currentIndex = -1;
		clearFindHighlight();
	};

	const find = () => {
		refreshMatches(editor);
		const session = getSession(editor);
		const offset = getCursorOffset(editor);
		const index = findMatchIndexAtOrAfter(session.matches, offset, true);
		selectMatchAtIndex(editor, index);
	};

	const findNext = () => {
		refreshMatches(editor);
		const session = getSession(editor);

		if (session.matches.length === 0) {
			session.currentIndex = -1;
			clearFindHighlight();
			return;
		}

		const nextIndex = findNextMatchIndex(session.matches, session.currentIndex);
		selectMatchAtIndex(editor, nextIndex);
	};

	const findPrevious = () => {
		refreshMatches(editor);
		const session = getSession(editor);

		if (session.matches.length === 0) {
			session.currentIndex = -1;
			clearFindHighlight();
			return;
		}

		const previousIndex = findPreviousMatchIndex(session.matches, session.currentIndex);
		selectMatchAtIndex(editor, previousIndex);
	};

	const replace = () => {
		refreshMatches(editor);
		const session = getSession(editor);

		if (session.currentIndex < 0 || !session.matches[session.currentIndex]) {
			find();
			return;
		}

		const current = session.matches[session.currentIndex];
		const replacement = session.replacement;
		replaceMatchAt(editor, current, replacement);

		refreshMatches(editor);

		if (session.matches.length === 0) {
			session.currentIndex = -1;
			clearFindHighlight();
			return;
		}

		const nextIndex = Math.min(session.currentIndex, session.matches.length - 1);
		selectMatchAtIndex(editor, nextIndex);
	};

	const replaceAll = () => {
		refreshMatches(editor);
		const session = getSession(editor);
		const replacement = session.replacement;
		const matches = [...session.matches];

		editor.runTransaction(() => {
			for (let index = matches.length - 1; index >= 0; index--) {
				const match = matches[index];
				const selection = editor.getSelection();
				if (!selection) continue;

				RangeHelpers.restoreSelectionByOffsets(
					selection,
					editor.root,
					match.start,
					match.end
				);
				const range = editor.getRange();
				range.deleteContents();

				if (replacement) {
					const textNode = editor.createText(replacement);
					range.insertNode(textNode);
				}
			}
		});

		session.matches = [];
		session.currentIndex = -1;
		clearFindHighlight();
	};

	const handleOpen: CommandHandler<'findReplace.open'> = (payload) =>
		open(payload as FindReplaceOptions | undefined);
	const handleClose: CommandHandler<'findReplace.close'> = () => close();
	const handleSetOptions: CommandHandler<'findReplace.setOptions'> = (payload) =>
		applyOptions(editor, payload as FindReplaceOptions);
	const handleFind: CommandHandler<'findReplace.find'> = () => find();
	const handleFindNext: CommandHandler<'findReplace.findNext'> = () => findNext();
	const handleFindPrevious: CommandHandler<'findReplace.findPrevious'> = () => findPrevious();
	const handleReplace: CommandHandler<'findReplace.replace'> = () => replace();
	const handleReplaceAll: CommandHandler<'findReplace.replaceAll'> = () => replaceAll();
	const handleGetState = () => getState(editor);
	const onModF = (event: KeyboardEvent) => {
		event.preventDefault();
		open();
	};
	const onModH = (event: KeyboardEvent) => {
		event.preventDefault();
		open();
	};

	editor.registerCommand('findReplace.open', handleOpen);
	editor.registerCommand('findReplace.close', handleClose);
	editor.registerCommand('findReplace.setOptions', handleSetOptions);
	editor.registerCommand('findReplace.find', handleFind);
	editor.registerCommand('findReplace.findNext', handleFindNext);
	editor.registerCommand('findReplace.findPrevious', handleFindPrevious);
	editor.registerCommand('findReplace.replace', handleReplace);
	editor.registerCommand('findReplace.replaceAll', handleReplaceAll);
	editor.registerState('findReplace.state', handleGetState);
	editor.onShortcut('mod+f', onModF);
	editor.onShortcut('mod+h', onModH);

	return () => {
		editor.unregisterCommand('findReplace.open', handleOpen);
		editor.unregisterCommand('findReplace.close', handleClose);
		editor.unregisterCommand('findReplace.setOptions', handleSetOptions);
		editor.unregisterCommand('findReplace.find', handleFind);
		editor.unregisterCommand('findReplace.findNext', handleFindNext);
		editor.unregisterCommand('findReplace.findPrevious', handleFindPrevious);
		editor.unregisterCommand('findReplace.replace', handleReplace);
		editor.unregisterCommand('findReplace.replaceAll', handleReplaceAll);
		editor.unregisterState('findReplace.state', handleGetState);
		editor.offShortcut('mod+f', onModF);
		editor.offShortcut('mod+h', onModH);
		clearFindHighlight();
		sessions.delete(editor);
	};
};
