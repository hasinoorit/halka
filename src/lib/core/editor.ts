import { Range as RangeHelpers, Node as NodeHelpers, isElementNode } from '../helpers/index.js';
import { isInsideReadonly } from '../helpers/node.js';
import { isEmptyBlock } from '../helpers/block.js';
import { Schema } from './schema.js';
import { Query } from './query.js';
import { Transform } from './transform.js';
import { HalkaSelection } from './selection.js';
import { InputManager } from './input.js';
import type { Action, ChangeEventDetail, TransactionMeta, InsertContentOptions } from '../history/types.js';
import { captureEditableSnapshot } from '../history/capture.js';
import { captureSelection } from '../history/selection.js';

export type { Action, ChangeEventDetail, TransactionMeta, InsertContentOptions } from '../history/types.js';

export function getChangeHtml(data: string | ChangeEventDetail): string {
	return typeof data === 'string' ? data : data.html;
}

export type HalkaPlugin = (editor: Editor) => () => void;

export type HalkaDeclarativePlugin = {
	name: string;
	commands?: Record<string, (editor: Editor, payload?: unknown) => void>;
	states?: Record<string, (editor: Editor, payload?: unknown) => unknown>;
	shortcuts?: Record<string, string | ((editor: Editor, event: KeyboardEvent) => void)>;
	events?: Record<string, (editor: Editor, event: Event) => void>;
};

export function definePlugin(config: HalkaDeclarativePlugin): HalkaPlugin {
	return (editor: Editor) => {
		const cleanupFns: (() => void)[] = [];

		if (config.commands) {
			for (const [name, handler] of Object.entries(config.commands)) {
				const wrapped = (payload?: unknown) => handler(editor, payload);
				editor.registerCommand(name as any, wrapped as any);
				cleanupFns.push(() => editor.unregisterCommand(name as any, wrapped as any));
			}
		}

		if (config.states) {
			for (const [name, handler] of Object.entries(config.states)) {
				const wrapped = (payload?: unknown) => handler(editor, payload);
				editor.registerState(name as any, wrapped as any);
				cleanupFns.push(() => editor.unregisterState(name as any, wrapped as any));
			}
		}

		if (config.shortcuts) {
			for (const [shortcut, handler] of Object.entries(config.shortcuts)) {
				if (typeof handler === 'string') {
					const commandName = handler;
					const listener = (event: KeyboardEvent) => {
						editor.execCommand(commandName as any, event);
					};
					editor.onShortcut(shortcut, listener);
					cleanupFns.push(() => editor.offShortcut(shortcut, listener));
				} else {
					const listener = (event: KeyboardEvent) => handler(editor, event);
					editor.onShortcut(shortcut, listener);
					cleanupFns.push(() => editor.offShortcut(shortcut, listener));
				}
			}
		}

		if (config.events) {
			for (const [eventName, handler] of Object.entries(config.events)) {
				const listener = (event: Event) => handler(editor, event);
				editor.root.addEventListener(eventName, listener as any);
				cleanupFns.push(() => editor.root.removeEventListener(eventName, listener as any));
			}
		}

		return () => {
			for (const fn of cleanupFns) fn();
		};
	};
}
export type HalkaOptions = {
	plugins?: HalkaPlugin[];
	shortcuts?: boolean;
	inline?: boolean;
};

export interface EditorCommandMap {
	[command: string]: unknown;
}

export interface EditorStateMap {
	[state: string]: unknown;
}

export interface EditorStatePayloadMap {
	[state: string]: unknown;
}

export interface EditorEventMap {
	change: string | ChangeEventDetail;
	formatChange: void;
	[event: string]: unknown;
}

export type EditorCommandName = keyof EditorCommandMap & string;
export type EditorStateName = keyof EditorStateMap & string;
export type EditorEventName = keyof EditorEventMap & string;

export type CommandHandler<Name extends EditorCommandName = EditorCommandName> = (
	payload?: EditorCommandMap[Name]
) => void;

export type StateHandler<Name extends EditorStateName = EditorStateName> = (
	payload?: EditorStatePayloadMap[Name]
) => EditorStateMap[Name];

export abstract class Editor {
	root: HTMLElement;
	schema: Schema;
	private _query?: Query;
	private _transforms?: Transform;
	private _selection?: HalkaSelection;
	private _pendingFormats: Set<string>;
	private _pendingStyles: Map<string, string>;
	private _suppressedFormats: Set<string>;
	private _inputManager: InputManager;
	historyContext: { transactionActions: Action[] } | null = null;
	isComposing = false;

	constructor(root: HTMLElement) {
		this.root = root;
		this.schema = new Schema();
		this._pendingFormats = new Set();
		this._pendingStyles = new Map();
		this._suppressedFormats = new Set();
		this._inputManager = new InputManager(this);
	}

	/**
	 * Query API for reading editor state
	 */
	get query(): Query {
		if (!this._query) {
			this._query = new Query(this);
		}
		return this._query;
	}

	/**
	 * Transform API for mutating editor state (chainable)
	 */
	get transforms(): Transform {
		if (!this._transforms) {
			this._transforms = new Transform(this);
		}
		return this._transforms;
	}

	/**
	 * Enhanced Selection API
	 */
	get selection(): HalkaSelection {
		if (!this._selection) {
			this._selection = new HalkaSelection(this);
		}
		return this._selection;
	}

	registerNormalizer(fn: (range: Range) => Range | null): void {
		this.selection.registerNormalizer(fn);
	}

	/**
	 * Add a format to the pending state (next typed char will have this format)
	 */
	addPendingFormat(tagName: string): void {
		this._pendingFormats.add(tagName.toUpperCase());
		this.emit('formatChange');
	}

	/**
	 * Remove a format from the pending state
	 */
	removePendingFormat(tagName: string): void {
		this._pendingFormats.delete(tagName.toUpperCase());
		this.emit('formatChange');
	}

	/**
	 * Clear all pending formats
	 */
	clearPendingFormats(): void {
		this._pendingFormats.clear();
		this.emit('formatChange');
	}

	/**
	 * Get active pending formats
	 */
	getPendingFormats(): Set<string> {
		return new Set(this._pendingFormats);
	}

	/**
	 * Add a pending inline style (next typed text will have this style)
	 */
	addPendingStyle(property: string, value: string): void {
		this._pendingStyles.set(property, value);
		this.emit('formatChange');
	}

	/**
	 * Remove a pending inline style
	 */
	removePendingStyle(property: string): void {
		this._pendingStyles.delete(property);
		this.emit('formatChange');
	}

	/**
	 * Clear all pending inline styles
	 */
	clearPendingStyles(): void {
		this._pendingStyles.clear();
		this.emit('formatChange');
	}

	/**
	 * Get active pending inline styles
	 */
	getPendingStyles(): Map<string, string> {
		return new Map(this._pendingStyles);
	}

	/**
	 * Suppress an inherited DOM format for the next typed text (without unwrapping existing content).
	 */
	addSuppressedFormat(tagName: string): void {
		this._suppressedFormats.add(tagName.toUpperCase());
		this.emit('formatChange');
	}

	removeSuppressedFormat(tagName: string): void {
		this._suppressedFormats.delete(tagName.toUpperCase());
		this.emit('formatChange');
	}

	clearSuppressedFormats(): void {
		this._suppressedFormats.clear();
		this.emit('formatChange');
	}

	getSuppressedFormats(): Set<string> {
		return new Set(this._suppressedFormats);
	}

	get inline(): boolean {
		return false;
	}

	ensureDocumentStructure(options?: { emit?: boolean }): void {}

	reportContentChangeIfNeeded(): void {}

	abstract getHTML(): string;
	abstract setHTML(html: string): void;
	abstract insertHTML(html: string, options?: InsertContentOptions): void;
	abstract insertText(text: string, options?: InsertContentOptions): void;
	abstract getSelection(): Selection | null;
	abstract getRange(): Range;
	abstract setSelection(range: Range): void;
	abstract setInlineStyle(style: string, value?: string): void;
	abstract setBlockStyle(style: string, value?: string): void;
	abstract clearStyles(): void;
	abstract toggleInlineFormat(format: string): void;
	abstract toggleBlockFormat(format: string): void;
	abstract normalizeSelection(): void;
	abstract normalizeHTML(): void;
	abstract applySelection(forceRestore?: boolean): void;
	abstract createEl<K extends keyof HTMLElementTagNameMap>(
		tagName: K,
		options?: ElementCreationOptions
	): HTMLElementTagNameMap[K];
	abstract createEl(tagName: string, options?: ElementCreationOptions): HTMLElement;
	abstract createText(text: string): Text;
	abstract runTransaction(cb: (editor: Editor) => void, meta?: TransactionMeta): void;

	pushHistoryActions(actions: Action[]): void {
		this.historyContext?.transactionActions.push(...actions);
	}
	destroy(): void {
		this._inputManager.destroy();
	}
	abstract get window(): Window;
	abstract computeSelectionOffsets(range: Range): { start: number; end: number } | undefined;

	abstract hasFormat(format: string): boolean;
	abstract getStyle(property: string): string | undefined;

	abstract registerCommand<Name extends EditorCommandName>(
		name: Name,
		handler: CommandHandler<Name>
	): void;
	abstract unregisterCommand<Name extends EditorCommandName>(
		name: Name,
		handler: CommandHandler<Name>
	): void;
	abstract execCommand<Name extends EditorCommandName>(
		name: Name,
		payload?: EditorCommandMap[Name]
	): void;

	abstract registerState<Name extends EditorStateName>(
		name: Name,
		handler: StateHandler<Name>
	): void;
	abstract unregisterState<Name extends EditorStateName>(
		name: Name,
		handler: StateHandler<Name>
	): void;
	abstract getState<Name extends EditorStateName>(
		name: Name,
		payload?: EditorStatePayloadMap[Name]
	): EditorStateMap[Name] | undefined;

	abstract on<Name extends EditorEventName>(
		event: Name,
		callback: (data?: EditorEventMap[Name]) => void
	): void;
	abstract off<Name extends EditorEventName>(
		event: Name,
		callback: (data?: EditorEventMap[Name]) => void
	): void;
	abstract emit<Name extends EditorEventName>(event: Name, data?: EditorEventMap[Name]): void;
	abstract onShortcut(event: string, callback: (data: KeyboardEvent) => void): void;
	abstract offShortcut(event: string, callback: (data: KeyboardEvent) => void): void;

	abstract getSelectionOffsets(): { start: number; end: number } | undefined;
	abstract setSelectionOffsets(offsets: { start: number; end: number }): void;
}
type EventListener<Name extends EditorEventName = EditorEventName> = (
	data?: EditorEventMap[Name]
) => void;
type ShortcutListener = (event: KeyboardEvent) => void;
type AnyListener = (data?: unknown) => void;
type AnyCommandHandler = (payload?: unknown) => void;

export class HalkaEditor extends Editor {
	private options: Required<HalkaOptions>;
	private listeners = new Map<string, Set<AnyListener>>();
	private shortcutListeners = new Map<string, Set<ShortcutListener>>();
	private commands = new Map<string, Set<AnyCommandHandler>>();
	private states = new Map<string, StateHandler>();
	private pluginCleanups: (() => void)[] = [];
	private handleKeydownBound: (event: KeyboardEvent) => void;
	private handleSelectionChangeBound: () => void;
	private handleBlurBound: () => void;
	private handleFocusBound: () => void;
	private handleCompositionStartBound: () => void;
	private handleCompositionEndBound: () => void;
	private transactionDepth = 0;
	private savedSelectionRange: Range | undefined;
	private savedSelectionOffsets: { start: number; end: number } | undefined;
	private activeFormats: Record<string, boolean> = {};
	private activeStyles: Record<string, string> = {};
	private lastReportedHTML = '';

	constructor(root: HTMLElement, options: HalkaOptions = {}) {
		super(root);
		this.options = {
			shortcuts: options.shortcuts ?? true,
			plugins: options.plugins ?? [],
			inline: options.inline ?? false
		};

		if (!this.root.isContentEditable) {
			this.root.contentEditable = 'true';
		}

		this.handleKeydownBound = (event) => this.handleKeydown(event);
		this.handleSelectionChangeBound = () => this.updateActiveFormatsAndStyles();
		this.handleBlurBound = () => this.saveSelection();
		this.handleFocusBound = () => this.handleFocus();
		this.handleCompositionStartBound = () => {
			this.isComposing = true;
		};
		this.handleCompositionEndBound = () => {
			this.isComposing = false;
			this.emit('compositionend');
		};

		if (this.options.shortcuts) {
			this.root.addEventListener('keydown', this.handleKeydownBound);
			this.onShortcut('mod+b', () => this.toggleInlineFormat('bold'));
			this.onShortcut('mod+i', () => this.toggleInlineFormat('italic'));
			this.onShortcut('mod+u', () => this.toggleInlineFormat('underline'));
		}

		this.window.document.addEventListener('selectionchange', this.handleSelectionChangeBound);
		this.root.addEventListener('blur', this.handleBlurBound);
		this.root.addEventListener('focus', this.handleFocusBound);
		this.root.addEventListener('compositionstart', this.handleCompositionStartBound);
		this.root.addEventListener('compositionend', this.handleCompositionEndBound);

		this.pluginCleanups = (this.options.plugins ?? []).map((plugin) => plugin(this));
		this.registerDefaultNormalizers();
		this.ensureDocumentStructure({ emit: false });
		this.lastReportedHTML = this.getHTML();
	}

	get inline(): boolean {
		return this.options.inline;
	}

	get window(): Window {
		return this.root.ownerDocument.defaultView ?? window;
	}
	createEl<K extends keyof HTMLElementTagNameMap>(
		tagName: K,
		options?: ElementCreationOptions
	): HTMLElementTagNameMap[K];
	createEl(tagName: string, options?: ElementCreationOptions): HTMLElement {
		return this.window.document.createElement(tagName as any, options);
	}
	createText(text: string): Text {
		return this.window.document.createTextNode(text);
	}

	private updateActiveFormatsAndStyles() {
		const selection = this.window.getSelection();
		if (
			!selection ||
			selection.rangeCount === 0 ||
			!this.root.contains(selection.getRangeAt(0).commonAncestorContainer)
		) {
			this.activeFormats = {};
			this.activeStyles = {};
			return;
		}

		this.saveSelection();

		this.activeFormats = {};
		this.activeStyles = {};

		const range = selection.getRangeAt(0);
		let currentNode: Node | null = range.commonAncestorContainer;

		while (currentNode && currentNode !== this.root) {
			if (currentNode.nodeType === Node.ELEMENT_NODE) {
				const el = currentNode as HTMLElement;
				const tagName = el.tagName.toUpperCase();

				this.activeFormats[tagName] = true;

				if (el.hasAttribute('style')) {
					const style = el.style;
					for (let i = 0; i < style.length; i++) {
						const prop = style[i];
						const value = style.getPropertyValue(prop);
						if (value && !this.activeStyles[prop]) {
							this.activeStyles[prop] = value;
						}
					}
				}
			}
			currentNode = currentNode.parentNode;
		}

		this.emit('formatChange');
	}

	hasFormat(format: string): boolean {
		const tagName = this.getInlineTagName(format) || this.getBlockTagName(format);
		return !!(tagName && this.activeFormats[tagName.toUpperCase()]);
	}

	getStyle(property: string): string | undefined {
		const range = this.getRange();
		if (range.collapsed) {
			const pending = this.getPendingStyles();
			if (pending.has(property)) {
				return pending.get(property);
			}
		}
		return this.activeStyles[property];
	}

	getHTML(): string {
		return this.root.innerHTML;
	}

	setHTML(html: string, meta?: TransactionMeta): void {
		this.runTransaction((editor) => {
			(editor as HalkaEditor).root.innerHTML = html;
			this.savedSelectionRange = undefined;
			this.savedSelectionOffsets = undefined;
			const selection = this.window.getSelection();
			if (selection) selection.removeAllRanges();
		}, meta);
	}

	insertHTML(html: string, options?: InsertContentOptions): void {
		this.runTransaction(
			() => {
				const selection = this.getSelection();
				const range =
					options?.range?.cloneRange() ??
					(selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null);
				if (!range || !this.root.contains(range.commonAncestorContainer)) return;

				RangeHelpers.expandRangeForVoidNodes(range);

				const emptyBlock = !this.inline ? this.findEmptyBlockForInsertion(range) : null;

				range.deleteContents();
				const fragment = range.createContextualFragment(html);

				const lastNode = fragment.lastChild;
				if (!lastNode) return;

				if (emptyBlock?.parentNode) {
					const parent = emptyBlock.parentNode;
					while (fragment.firstChild) {
						parent.insertBefore(fragment.firstChild, emptyBlock);
					}
					emptyBlock.remove();
					this.selection.setCursorAfter(lastNode);
					return;
				}

				range.insertNode(fragment);
				this.selection.setCursorAfter(lastNode);
			},
			{ history: options?.history ?? 'group' }
		);
	}

	insertText(text: string, options?: InsertContentOptions): void {
		if (this.inline) {
			text = text.replace(/[\r\n]+/g, ' ');
		} else if (/[\r\n]/.test(text)) {
			this.insertTextAsBlocks(text);
			return;
		}

		this.runTransaction(
			() => {
				const selection = this.getSelection();
				const range =
					options?.range?.cloneRange() ??
					(selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null);
				if (!range || !this.root.contains(range.commonAncestorContainer)) return;

				RangeHelpers.expandRangeForVoidNodes(range);

				range.deleteContents();
				const textNode = this.window.document.createTextNode(text);
				range.insertNode(textNode);

				this.selection.setCursorAfter(textNode);
			},
			{ history: options?.history ?? 'group' }
		);
	}

	getRange(): Range {
		// Try to get a live range from the current window selection first
		const selection = this.window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			if (this.root.contains(range.commonAncestorContainer)) {
				return range;
			}
		}

		if (this.savedSelectionRange && this.root.contains(this.savedSelectionRange.commonAncestorContainer)) {
			try {
				const cloned = this.savedSelectionRange.cloneRange();
				cloned.startContainer;
				return cloned;
			} catch (e) {}
		}

		// Fall back to restoring saved selection if the live one is outside root
		if (this.savedSelectionOffsets) {
			const sel = this.window.getSelection();
			if (sel) {
				RangeHelpers.restoreSelectionByOffsets(
					sel,
					this.root,
					this.savedSelectionOffsets.start,
					this.savedSelectionOffsets.end
				);
				if (sel.rangeCount > 0) return sel.getRangeAt(0);
			}
		}
		// Final safe fallback: collapsed range at end of editor
		return this.createCollapsedRangeAtEnd();
	}

	getSelection(): Selection | null {
		const selection = this.window.getSelection();
		const currentRange = RangeHelpers.getRange(this.window);

		if (!selection || !currentRange || !this.root.contains(currentRange.commonAncestorContainer)) {
			this.applySelection();
		}

		return selection;
	}

	setSelection(range: Range): void {
		const selection = this.window.getSelection();
		if (!selection) return;

		if (!this.root.contains(range.commonAncestorContainer)) {
			return;
		}

		selection.removeAllRanges();
		selection.addRange(range);
		this.selection.normalize();

		const liveRange =
			selection.rangeCount > 0 ? selection.getRangeAt(0) : range;
		this.savedSelectionRange = liveRange.cloneRange();
		this.savedSelectionOffsets = this.computeSelectionOffsets(liveRange);
	}

	getSelectionOffsets(): { start: number; end: number } | undefined {
		return this.savedSelectionOffsets;
	}

	setSelectionOffsets(offsets: { start: number; end: number }): void {
		this.savedSelectionOffsets = offsets;
		this.savedSelectionRange = undefined;
	}

	setInlineStyle(style: string, value?: string): void {
		const isColorStyle = style === 'color' || style === 'background-color';

		this.runTransaction(() => {
			const range = this.getRange();

			if (isColorStyle && value === undefined) {
				this.removePendingStyle(style);
				this.clearNearestStyleProperty(style, range);
				return;
			}

			if (isColorStyle && range.collapsed && !this.inline) {
				this.setBlockStyle(style, value);
				return;
			}

			const selectedElement = RangeHelpers.isSelectedAnElement(range);
			let span: HTMLElement | null = null;

			if (isElementNode(selectedElement) && selectedElement.tagName === 'SPAN') {
				span = selectedElement as HTMLElement;
			} else {
				const node = range.commonAncestorContainer;
				const element =
					isElementNode(node)
						? node as HTMLElement
						: isElementNode(node.parentElement)
							? node.parentElement as HTMLElement
							: null;
				span = element ? element.closest('span') : null;
			}

			if (span && this.root.contains(span)) {
				if (value) {
					span.style.setProperty(style, value);
					return;
				}

				span.style.removeProperty(style);
				const remainingStyle = span.getAttribute('style');

				if (!remainingStyle || remainingStyle.trim() === '') {
					NodeHelpers.unwrap(span);
				}
				return;
			}

			if (value === undefined) {
				this.removePendingStyle(style);
				return;
			}

			if (range.collapsed) {
				this.addPendingStyle(style, value);
				return;
			}

			const element = this.createEl('span');
			element.style.setProperty(style, value);
			RangeHelpers.surround(element, this.window);
		});
	}

	private clearNearestStyleProperty(style: string, range: Range): void {
		this.selection.preserveSelection(() => {
			let node: Node | null = range.startContainer;

			if (node.nodeType === Node.TEXT_NODE) {
				node = node.parentElement;
			}

			let element = isElementNode(node) ? (node as HTMLElement) : null;

			while (element && element !== this.root) {
				if (element.style.getPropertyValue(style)) {
					element.style.removeProperty(style);
					const remainingStyle = element.getAttribute('style');

					if (
						element.tagName === 'SPAN' &&
						(!remainingStyle || remainingStyle.trim() === '')
					) {
						NodeHelpers.unwrap(element);
					}
					return;
				}
				element = element.parentElement;
			}
		});
	}

	setBlockStyle(style: string, value?: string): void {
		this.runTransaction(() => {
			this.selection.preserveSelection(() => {
			const range = this.getRange();
			let element: HTMLElement | null =
				isElementNode(range.commonAncestorContainer)
					? range.commonAncestorContainer as HTMLElement
					: isElementNode(range.commonAncestorContainer.parentElement)
						? range.commonAncestorContainer.parentElement as HTMLElement
						: null;

			while (element && element !== this.root && getComputedStyle(element).display === 'inline') {
				element = element.parentElement;
			}

			if (!element || element === this.root) return;

			if (value !== undefined) {
				element.style.setProperty(style, value);
			} else {
				element.style.removeProperty(style);
			}
			});
		});
	}

	clearStyles(): void {
		this.clearPendingStyles();
		this.runTransaction(() => {
			this.selection.preserveSelection(() => {
				const scope = this.getSelectionRoot(this.getRange());
				if (!scope) return;

				const styledElements = scope.querySelectorAll('[style]');
				for (const element of styledElements) {
					if (!(element instanceof HTMLElement) || isInsideReadonly(element)) continue;
					element.removeAttribute('style');
				}

				if (!isInsideReadonly(scope) && scope.hasAttribute('style')) {
					scope.removeAttribute('style');
				}

				this.removeUnstyledSpans(scope);
				this.normalizeHTML();
			});
		});
	}

	private getSelectionRoot(range: Range): HTMLElement | null {
		if (range.collapsed) {
			const block =
				this.query.getCurrentBlock() ??
				NodeHelpers.getClosestBlockElement(range.startContainer, this.root);
			if (block instanceof HTMLElement && block !== this.root) {
				return block;
			}
			return this.inline ? this.root : null;
		}

		const ancestor = range.commonAncestorContainer;
		if (isElementNode(ancestor)) {
			return ancestor as HTMLElement;
		}

		return ancestor.parentElement;
	}

	toggleInlineFormat(format: string): void {
		const tagName = this.getInlineTagName(format);
		if (!tagName) return;
		// Use the new transforms API
		this.transforms.toggleMark(tagName);
	}

	toggleBlockFormat(format: string): void {
		if (this.inline) return;

		this.runTransaction(() => {
			const tagName = this.getBlockTagName(format);
			if (!tagName) return;

			const range = this.getRange();
			const currentBlock = NodeHelpers.getClosestBlockElement(
				range.commonAncestorContainer,
				this.root
			);

			if (!currentBlock || currentBlock === this.root) return;

			const currentTag = currentBlock.tagName;
			const nextTag = currentTag === tagName ? 'P' : tagName;

			this.selection.preserveSelection(() => {
				const newBlock = this.createEl(nextTag as any);
				if (currentBlock.getAttribute('style')) {
					newBlock.setAttribute('style', currentBlock.getAttribute('style') ?? '');
				}

				NodeHelpers.copyPasteChildNodes(newBlock, currentBlock);
				this.root.replaceChild(newBlock, currentBlock);
			});
			// Do NOT reset savedSelectionRange here — preserveSelection already
			// restored the cursor via markers; resetting would break applySelection.
		});
	}

	normalizeSelection(): void {
		const selection = this.window.getSelection();
		if (!selection) return;

		const range = RangeHelpers.getRange(this.window);

		if (!range || !this.root.contains(range.commonAncestorContainer)) {
			const collapsed = this.createCollapsedRangeAtEnd();
			if (!collapsed) return;
			selection.removeAllRanges();
			selection.addRange(collapsed);
		}
	}

	normalizeHTML(): void {
		if (this.inline) {
			this.normalizeInlineHTML();
			return;
		}
		this.normalizeBlockHTML();
	}

	ensureDocumentStructure(options: { emit?: boolean } = {}): void {
		const shouldEmit = options.emit !== false;
		const needsNorm = this.needsDocumentNormalization();
		if (!needsNorm) return;

		const selection = this.window.getSelection();
		const offsets =
			selection &&
			selection.rangeCount > 0 &&
			this.root.contains(selection.getRangeAt(0).commonAncestorContainer)
				? this.computeSelectionOffsets(selection.getRangeAt(0))
				: this.savedSelectionOffsets;

		const before = this.getHTML();
		this.normalizeHTML();

		this.reconcileSelectionAfterMutation(offsets);
		this.saveSelection();

		const after = this.getHTML();
		if (shouldEmit && before !== after) {
			this.reportContentChangeIfNeeded();
		}
	}

	reportContentChangeIfNeeded(): void {
		const html = this.getHTML();
		if (html === this.lastReportedHTML) return;
		this.lastReportedHTML = html;
		const detail: ChangeEventDetail = { html, phase: 'after' };
		this.emit('change', detail);
	}

	private needsDocumentNormalization(): boolean {
		if (this.inline) {
			for (const child of this.root.childNodes) {
				if (isElementNode(child) && this.schema.isBlock(child.tagName)) {
					return true;
				}
			}

			if (this.root.querySelector('br')) return true;

			const walker = this.window.document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
			while (walker.nextNode()) {
				if (/[\r\n]/.test((walker.currentNode as Text).data)) {
					return true;
				}
			}

			return false;
		}

		if (this.root.innerHTML.trim() === '') return true;

		for (const child of this.root.childNodes) {
			if (this.isLooseRootChild(child)) return true;
		}

		const walker = this.window.document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
		while (walker.nextNode()) {
			if (/[\r\n]/.test((walker.currentNode as Text).data)) {
				return true;
			}
		}

		return false;
	}

	applySelection(forceRestore: boolean = false): void {
		const selection = this.window.getSelection();
		const currentRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
		if (!forceRestore && currentRange && this.root.contains(currentRange.commonAncestorContainer)) {
			this.selection.normalize();
			return;
		}

		if (this.savedSelectionRange && this.root.contains(this.savedSelectionRange.commonAncestorContainer)) {
			try {
				const cloned = this.savedSelectionRange.cloneRange();
				selection?.removeAllRanges();
				selection?.addRange(cloned);
				this.selection.normalize();
				return;
			} catch (e) {
				// Fall through to text offsets if applying native range fails
			}
		}
		if (this.savedSelectionOffsets) {
			RangeHelpers.restoreSelectionByOffsets(
				this.window.getSelection()!,
				this.root,
				this.savedSelectionOffsets.start,
				this.savedSelectionOffsets.end
			);
		} else {
			this.normalizeSelection();
		}
		this.selection.normalize();
	}

	runTransaction(cb: (editor: Editor) => void, meta: TransactionMeta = {}): void {
		const historyMode = meta.history ?? 'record';
		const beforeHTML = this.getHTML();
		const selectionBefore = captureSelection(this);
		const beforeSnapshot =
			historyMode !== 'skip'
				? captureEditableSnapshot(this.root, selectionBefore)
				: undefined;

		this.transactionDepth += 1;
		const parentContext = this.historyContext;
		this.historyContext = { transactionActions: [] };

		const currentSelection = this.window.getSelection();
		const hasActiveSelection =
			currentSelection &&
			currentSelection.rangeCount > 0 &&
			this.root.contains(currentSelection.getRangeAt(0).commonAncestorContainer);

		const preMutationOffsets =
			meta.preferredSelection ??
			(hasActiveSelection && currentSelection!.rangeCount > 0
				? this.computeSelectionOffsets(currentSelection!.getRangeAt(0))
				: this.savedSelectionOffsets);

		const offsetsAtStart = this.savedSelectionOffsets
			? { start: this.savedSelectionOffsets.start, end: this.savedSelectionOffsets.end }
			: undefined;

		this.root.focus();

		if (!hasActiveSelection && (this.savedSelectionRange || this.savedSelectionOffsets)) {
			this.applySelection(true);
		}

		cb(this);

		const offsetsAfterCb = this.savedSelectionOffsets;
		const selectionWasExplicit =
			!!meta.preferredSelection ||
			(!!offsetsAfterCb &&
				(!offsetsAtStart ||
					offsetsAfterCb.start !== offsetsAtStart.start ||
					offsetsAfterCb.end !== offsetsAtStart.end));

		const preferredOffsets = selectionWasExplicit
			? (meta.preferredSelection ?? offsetsAfterCb)
			: preMutationOffsets;

		let merged = false;
		try {
			const range = this.getRange();
			if (range) {
				let currentNode = range.commonAncestorContainer;

				if (currentNode.nodeType === Node.TEXT_NODE) {
					currentNode = currentNode.parentElement || currentNode;
				}

				if (this.root.contains(currentNode)) {
					if (NodeHelpers.mergeAdjacentChildren(currentNode, true)) {
						merged = true;
					}

					while (
						currentNode.parentElement &&
						currentNode.parentElement !== this.root &&
						currentNode.parentElement.childElementCount === 1
					) {
						currentNode = currentNode.parentElement;
					}

					if (currentNode.parentElement && this.root.contains(currentNode.parentElement)) {
						if (NodeHelpers.mergeAdjacentChildren(currentNode.parentElement, true)) {
							merged = true;
						}
					}
				}
			}
		} catch (e) {
			console.error('Error during node merging:', e);
		}

		if (merged) {
			this.reconcileSelectionAfterMutation(preferredOffsets);
		}

		const transactionActions = [...this.historyContext.transactionActions];
		this.historyContext = parentContext;
		this.transactionDepth -= 1;

		const afterHTML = this.getHTML();
		if (afterHTML !== beforeHTML) {
			const selection = this.window.getSelection();
			const postMutationOffsets =
				selection &&
				selection.rangeCount > 0 &&
				this.root.contains(selection.getRangeAt(0).commonAncestorContainer)
					? this.computeSelectionOffsets(selection.getRangeAt(0))
					: null;

			// For non-collapsed (range) selections that the callback didn't
			// explicitly change, the offsets captured BEFORE mutation are
			// authoritative — a helper's DOM surgery (e.g. surround) may have
			// corrupted or collapsed the live range. We force-restore those.
			const preIsRange = !!preMutationOffsets && preMutationOffsets.start !== preMutationOffsets.end;
			const forceRestore = !selectionWasExplicit && preIsRange;

			// Collapsed carets are left to the post-callback live selection, which
			// may intentionally land in a new empty node (e.g. a fresh list item)
			// that text offsets cannot represent.
			const offsetsToRestore = selectionWasExplicit
				? (meta.preferredSelection ?? offsetsAfterCb)
				: forceRestore
					? preMutationOffsets
					: postMutationOffsets ?? offsetsAfterCb ?? preMutationOffsets;

			this.normalizeHTML();

			this.reconcileSelectionAfterMutation(offsetsToRestore, forceRestore);

			if (historyMode !== 'skip' && beforeSnapshot) {
				const selectionAfter = captureSelection(this);
				const afterSnapshot = captureEditableSnapshot(this.root, selectionAfter);
				const detail: ChangeEventDetail = {
					html: afterHTML,
					phase: 'after',
					snapshot: afterSnapshot,
					beforeSnapshot,
					transactionActions,
					historyMode,
					preferredSelection: meta.preferredSelection
				};
				this.lastReportedHTML = afterHTML;
				this.emit('change', detail);
			} else {
				this.reportContentChangeIfNeeded();
			}
		}
	}

	destroy(): void {
		if (this.options.shortcuts) {
			this.root.removeEventListener('keydown', this.handleKeydownBound);
		}

		this.window.document.removeEventListener('selectionchange', this.handleSelectionChangeBound);
		this.root.removeEventListener('blur', this.handleBlurBound);
		this.root.removeEventListener('focus', this.handleFocusBound);
		this.root.removeEventListener('compositionstart', this.handleCompositionStartBound);
		this.root.removeEventListener('compositionend', this.handleCompositionEndBound);

		for (const cleanup of this.pluginCleanups) {
			cleanup();
		}

		this.listeners.clear();
		this.shortcutListeners.clear();

		super.destroy();
	}

	on<Name extends EditorEventName>(event: Name, callback: EventListener<Name>): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(callback as AnyListener);
	}

	off<Name extends EditorEventName>(event: Name, callback: EventListener<Name>): void {
		this.listeners.get(event)?.delete(callback as AnyListener);
	}

	emit<Name extends EditorEventName>(event: Name, data?: EditorEventMap[Name]): void {
		this.listeners.get(event)?.forEach((listener) => listener(data));
	}

	onShortcut(event: string, callback: ShortcutListener): void {
		if (!this.shortcutListeners.has(event)) {
			this.shortcutListeners.set(event, new Set());
		}
		this.shortcutListeners.get(event)?.add(callback);
	}

	offShortcut(event: string, callback: ShortcutListener): void {
		this.shortcutListeners.get(event)?.delete(callback);
	}

	registerCommand<Name extends EditorCommandName>(name: Name, handler: CommandHandler<Name>): void {
		if (!this.commands.has(name)) {
			this.commands.set(name, new Set());
		}
		this.commands.get(name)?.add(handler as AnyCommandHandler);
	}

	unregisterCommand<Name extends EditorCommandName>(
		name: Name,
		handler: CommandHandler<Name>
	): void {
		this.commands.get(name)?.delete(handler as AnyCommandHandler);
	}

	execCommand<Name extends EditorCommandName>(name: Name, payload?: EditorCommandMap[Name]): void {
		const handlers = this.commands.get(name);
		if (!handlers || handlers.size === 0) return;
		for (const handler of handlers) {
			handler(payload);
		}
	}

	registerState<Name extends EditorStateName>(name: Name, handler: StateHandler<Name>): void {
		this.states.set(name, handler as any);
	}

	unregisterState<Name extends EditorStateName>(name: Name, handler: StateHandler<Name>): void {
		if (this.states.get(name) === (handler as any)) {
			this.states.delete(name);
		}
	}

	getState<Name extends EditorStateName>(
		name: Name,
		payload?: EditorStatePayloadMap[Name]
	): EditorStateMap[Name] | undefined {
		const handler = this.states.get(name);
		if (!handler) return undefined;
		return handler(payload) as EditorStateMap[Name];
	}

	private handleKeydown(event: KeyboardEvent): void {
		const key = this.normalizeShortcut(event);
		const listeners = this.shortcutListeners.get(key);
		if (!listeners || listeners.size === 0) return;

		event.preventDefault();
		listeners.forEach((listener) => listener(event));
	}

	private normalizeShortcut(event: KeyboardEvent): string {
		const parts: string[] = [];
		if (event.metaKey || event.ctrlKey) parts.push('mod');
		if (event.shiftKey) parts.push('shift');
		parts.push(event.key.toLowerCase());
		return parts.join('+');
	}

	computeSelectionOffsets(range: Range): { start: number; end: number } | undefined {
		const startRange = range.cloneRange();
		startRange.selectNodeContents(this.root);
		startRange.setEnd(range.startContainer, range.startOffset);
		const start = NodeHelpers.countEditableText(startRange.cloneContents());

		const endRange = range.cloneRange();
		endRange.selectNodeContents(this.root);
		endRange.setEnd(range.endContainer, range.endOffset);
		const end = NodeHelpers.countEditableText(endRange.cloneContents());
		return { start, end };
	}

	private saveSelection(): void {
		// Use window.getSelection() directly — NOT this.getSelection() which has
		// side-effects (calls applySelection) that corrupt the value being saved.
		const selection = this.window.getSelection();
		if (!selection || selection.rangeCount === 0) return;
		const range = selection.getRangeAt(0);
		if (!this.root.contains(range.commonAncestorContainer)) return;
		this.savedSelectionRange = range.cloneRange();
		this.savedSelectionOffsets = this.computeSelectionOffsets(range);
	}

	private getInlineTagName(format: string): string | undefined {
		switch (format.toLowerCase()) {
			case 'bold':
				return 'STRONG';
			case 'italic':
				return 'EM';
			case 'underline':
				return 'U';
			case 'code':
				return 'CODE';
			default:
				return undefined;
		}
	}

	private getBlockTagName(format: string): string | undefined {
		switch (format.toLowerCase()) {
			case 'paragraph':
			case 'p':
				return 'P';
			case 'h1':
				return 'H1';
			case 'h2':
				return 'H2';
			case 'h3':
				return 'H3';
			case 'blockquote':
				return 'BLOCKQUOTE';
			default:
				return undefined;
		}
	}

	private registerDefaultNormalizers(): void {
		this.registerNormalizer((range) => {
			if (!range.collapsed) return null;
			let node: Node | null = range.startContainer;
			if (node.nodeType === Node.TEXT_NODE) {
				node = node.parentNode;
			}
			while (node && node !== this.root) {
				if (this.schema.isVoidNode(node)) {
					const newRange = range.cloneRange();
					newRange.setStartAfter(node);
					newRange.collapse(true);
					return newRange;
				}
				node = node.parentNode;
			}
			return null;
		});

		this.registerNormalizer((range) => {
			let node: Node | null = range.commonAncestorContainer;
			let listContainer: HTMLElement | null = null;
			let listItem: HTMLElement | null = null;

			while (node && node !== this.root) {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const el = node as HTMLElement;
					const tag = el.tagName;
					if (tag === 'LI') {
						listItem = el;
					}
					if (tag === 'UL' || tag === 'OL') {
						listContainer = el;
						break;
					}
				}
				node = node.parentNode;
			}

			if (!listContainer || listItem) return null;

			let targetLi: HTMLElement | null = null;
			if (range.startContainer === listContainer) {
				const nodes = Array.from(listContainer.childNodes);
				const childIndex = Math.max(0, Math.min(range.startOffset, nodes.length));

				for (let i = childIndex; i < nodes.length; i++) {
					const candidate = nodes[i];
					if (isElementNode(candidate) && candidate.tagName === 'LI') {
						targetLi = candidate as HTMLElement;
						break;
					}
				}

				if (!targetLi) {
					for (let i = childIndex - 1; i >= 0; i--) {
						const candidate = nodes[i];
						if (isElementNode(candidate) && candidate.tagName === 'LI') {
							targetLi = candidate as HTMLElement;
							break;
						}
					}
				}
			}

			if (!targetLi) {
				targetLi = listContainer.querySelector('li');
			}
			if (!targetLi) {
				targetLi = this.createEl('li');
				const br = this.createEl('br');
				targetLi.appendChild(br);
				listContainer.appendChild(targetLi);
			}

			const newRange = range.cloneRange();
			newRange.selectNodeContents(targetLi);
			newRange.collapse(true);
			return newRange;
		});
	}

	private reconcileSelectionAfterMutation(
		offsets?: { start: number; end: number },
		force: boolean = false
	): void {
		const selection = this.window.getSelection();
		if (!selection) return;

		// Unless forced to apply the provided offsets, keep a valid live range.
		if (!force) {
			const liveRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
			if (liveRange && this.isRangeInRoot(liveRange)) {
				this.selection.normalize();
				this.saveSelection();
				return;
			}
		}

		const restoreOffsets = offsets ?? this.savedSelectionOffsets;
		if (restoreOffsets) {
			RangeHelpers.restoreSelectionByOffsets(
				selection,
				this.root,
				restoreOffsets.start,
				restoreOffsets.end
			);
			this.selection.normalize();
		}
		this.saveSelection();
	}

	private isRangeInRoot(range: Range): boolean {
		try {
			return this.root.contains(range.startContainer);
		} catch {
			return false;
		}
	}

	private normalizeBlockHTML(): void {
		if (this.root.innerHTML.trim() === '') {
			this.root.innerHTML = '<p><br></p>';
			return;
		}

		this.normalizeNewlineOnlyWhitespaceTextNodes();
		this.wrapRootLooseNodes();
		this.splitNewlinesInBlocks();
		this.mergeAdjacentEmptyParagraphs();
		this.removeEmptyRootParagraphs();
		this.removeOrphanedEmptyRootBlocks();
	}

	private normalizeNewlineOnlyWhitespaceTextNodes(): void {
		const walker = this.window.document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);

		while (walker.nextNode()) {
			const textNode = walker.currentNode as Text;
			if (!/[\r\n]/.test(textNode.data) || textNode.data.trim() !== '') continue;

			const parent = textNode.parentElement;
			if (!parent || parent === this.root) {
				textNode.remove();
				continue;
			}

			textNode.data = ' ';
		}
	}

	private isFirstSignificantTextInBlock(textNode: Text): boolean {
		let node: ChildNode | null = textNode.previousSibling;
		while (node) {
			if (node.nodeType === Node.TEXT_NODE) {
				if ((node as Text).data.trim() !== '') return false;
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				return false;
			}
			node = node.previousSibling;
		}
		return true;
	}

	private joinPrettyPrintedLineParts(parts: string[]): string {
		return parts[0] + parts.slice(1).map((part) => part.replace(/^\s+/, ' ')).join('');
	}

	private removeEmptyRootParagraphs(): void {
		const isSolePlaceholder =
			this.root.childNodes.length === 1 &&
			isElementNode(this.root.firstChild!) &&
			this.root.firstChild!.tagName === 'P' &&
			isEmptyBlock(this.root.firstChild as HTMLElement);

		if (isSolePlaceholder) return;

		for (const child of Array.from(this.root.children)) {
			if (!isElementNode(child) || child.tagName !== 'P') continue;
			if (this.isOrphanEmptyParagraph(child as HTMLElement)) {
				child.remove();
			}
		}
	}

	private isOrphanEmptyParagraph(element: HTMLElement): boolean {
		if (element.querySelector('img, hr, br, sup, code, a')) {
			return false;
		}

		const text = element.textContent ?? '';
		if (text.includes('\u00A0')) return false;

		return text.trim() === '';
	}

	private removeUnstyledSpans(scope: HTMLElement): void {
		const spans = Array.from(scope.querySelectorAll('span'));
		for (let i = spans.length - 1; i >= 0; i--) {
			const span = spans[i];
			if (!span.parentNode || isInsideReadonly(span)) continue;

			const style = span.getAttribute('style');
			if (!style || style.trim() === '') {
				NodeHelpers.unwrap(span);
			}
		}

		NodeHelpers.mergeAdjacentChildren(scope);
	}

	private normalizeInlineHTML(): void {
		if (this.root.innerHTML.trim() === '') {
			this.root.innerHTML = '';
			return;
		}

		const blockChildren = Array.from(this.root.childNodes).filter(
			(node) => isElementNode(node) && this.schema.isBlock((node as Element).tagName)
		);

		for (const block of blockChildren) {
			const parent = block.parentNode;
			if (!parent) continue;
			while (block.firstChild) {
				parent.insertBefore(block.firstChild, block);
			}
			parent.removeChild(block);
		}

		const walker = this.window.document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
		while (walker.nextNode()) {
			const textNode = walker.currentNode as Text;
			if (/[\r\n]/.test(textNode.data)) {
				textNode.data = textNode.data.replace(/[\r\n]+/g, ' ');
			}
		}

		const brElements = Array.from(this.root.querySelectorAll('br'));
		for (const br of brElements) {
			const space = this.createText(' ');
			br.parentNode?.replaceChild(space, br);
		}
	}

	private isLooseRootChild(node: Node): boolean {
		if (node.nodeType === Node.TEXT_NODE) return true;
		if (isElementNode(node)) {
			const tag = node.tagName;
			return this.schema.isInline(tag) || tag === 'BR';
		}
		return false;
	}

	private wrapRootLooseNodes(): void {
		let i = 0;
		while (i < this.root.childNodes.length) {
			const child = this.root.childNodes[i];
			if (!this.isLooseRootChild(child)) {
				i++;
				continue;
			}

			const looseNodes: Node[] = [];
			while (i < this.root.childNodes.length && this.isLooseRootChild(this.root.childNodes[i])) {
				looseNodes.push(this.root.childNodes[i]);
				i++;
			}
			this.wrapNodesInParagraph(looseNodes);
		}
	}

	private wrapNodesInParagraph(nodes: Node[]): void {
		if (nodes.length === 0) return;

		const first = nodes[0];
		const emptyParagraph = this.findAdjacentEmptyParagraph(first);
		if (emptyParagraph) {
			emptyParagraph.replaceChildren();
			for (const node of nodes) {
				emptyParagraph.appendChild(node);
			}
			if (emptyParagraph.childNodes.length === 0) {
				emptyParagraph.appendChild(this.createEl('br'));
			}
			return;
		}

		const paragraph = this.createEl('p');
		first.parentNode?.insertBefore(paragraph, first);
		for (const node of nodes) {
			paragraph.appendChild(node);
		}

		if (paragraph.childNodes.length === 0) {
			paragraph.appendChild(this.createEl('br'));
		}
	}

	private findAdjacentEmptyParagraph(node: Node): HTMLElement | null {
		for (const sibling of [node.previousSibling, node.nextSibling]) {
			if (
				sibling &&
				isElementNode(sibling) &&
				sibling.tagName === 'P' &&
				isEmptyBlock(sibling as HTMLElement)
			) {
				return sibling as HTMLElement;
			}
		}
		return null;
	}

	private splitNewlinesInBlocks(): void {
		const walker = this.window.document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
		const textNodesToSplit: Text[] = [];

		while (walker.nextNode()) {
			const textNode = walker.currentNode as Text;
			if (!/[\r\n]/.test(textNode.data)) continue;

			textNodesToSplit.push(textNode);
		}

		for (const textNode of textNodesToSplit) {
			this.splitTextNodeIntoBlocks(textNode);
		}
	}

	private splitTextNodeIntoBlocks(textNode: Text): void {
		let parts = textNode.data.split(/\r?\n/);
		let trimmedLeading = false;
		let hadTrailingLineBreak = false;

		while (parts.length > 1 && parts[0].trim() === '') {
			parts.shift();
			trimmedLeading = true;
		}

		while (parts.length > 1 && parts[parts.length - 1].trim() === '') {
			hadTrailingLineBreak = true;
			parts.pop();
		}

		const appendSpaceBeforeElementSibling = (value: string): string => {
			if (
				hadTrailingLineBreak &&
				textNode.nextSibling?.nodeType === Node.ELEMENT_NODE &&
				value &&
				!/\s$/.test(value)
			) {
				return `${value} `;
			}
			return value;
		};

		if (parts.length <= 1) {
			let value = parts[0] ?? '';
			if (trimmedLeading) {
				value = this.isFirstSignificantTextInBlock(textNode)
					? value.trimStart()
					: value.replace(/^\s+/, ' ');
			}
			textNode.data = appendSpaceBeforeElementSibling(value);
			return;
		}

		const shouldJoinPrettyPrintedLines =
			parts.every((part) => part.trim() !== '') &&
			parts.slice(1).some((part) => /^\s/.test(part));

		if (shouldJoinPrettyPrintedLines) {
			textNode.data = appendSpaceBeforeElementSibling(this.joinPrettyPrintedLineParts(parts));
			return;
		}

		const block = NodeHelpers.getClosestBlockElement(textNode, this.root);
		if (!block || block === this.root) return;

		const tagName = block.tagName.toLowerCase();
		const blockTag = this.schema.isBlock(tagName) ? tagName : 'p';

		textNode.data = trimmedLeading ? parts[0].trimStart() : parts[0];

		let insertAfter: Node = block;
		for (let i = 1; i < parts.length; i++) {
			const part = parts[i];
			if (!part.trim()) {
				continue;
			}

			const newBlock = this.createEl(blockTag as keyof HTMLElementTagNameMap);
			newBlock.appendChild(this.createText(part.trimStart()));
			insertAfter.parentNode?.insertBefore(newBlock, insertAfter.nextSibling);
			insertAfter = newBlock;
		}
	}

	private mergeAdjacentEmptyParagraphs(): void {
		const paragraphs = Array.from(this.root.querySelectorAll('p'));
		for (const paragraph of paragraphs) {
			if (!isEmptyBlock(paragraph as HTMLElement)) continue;

			const prev = paragraph.previousElementSibling;
			if (prev && prev.tagName === 'P' && isEmptyBlock(prev as HTMLElement)) {
				paragraph.remove();
			}
		}
	}

	private removeOrphanedEmptyRootBlocks(): void {
		const isSolePlaceholder =
			this.root.childNodes.length === 1 &&
			isElementNode(this.root.firstChild!) &&
			this.root.firstChild!.tagName === 'P' &&
			isEmptyBlock(this.root.firstChild as HTMLElement);

		if (isSolePlaceholder) return;

		for (const child of Array.from(this.root.children)) {
			if (!isElementNode(child)) continue;

			const tag = child.tagName.toUpperCase();
			if (tag === 'P' || tag === 'UL' || tag === 'OL' || tag === 'TABLE') continue;
			if (!this.schema.isBlock(tag)) continue;
			if (!isEmptyBlock(child as HTMLElement)) continue;

			child.remove();
		}
	}

	private findEmptyBlockForInsertion(range: Range): HTMLElement | null {
		const block = NodeHelpers.getClosestBlockElement(range.commonAncestorContainer, this.root);
		if (block && block !== this.root && isEmptyBlock(block)) {
			return block;
		}

		if (this.root.childNodes.length === 1) {
			const onlyChild = this.root.firstChild;
			if (
				isElementNode(onlyChild) &&
				this.schema.isBlock(onlyChild.tagName) &&
				isEmptyBlock(onlyChild as HTMLElement)
			) {
				return onlyChild as HTMLElement;
			}
		}

		return null;
	}

	private insertTextAsBlocks(text: string): void {
		const lines = text.split(/\r?\n/);
		this.runTransaction(() => {
			const selection = this.getSelection();
			if (!selection) return;

			const range = selection.getRangeAt(0);
			range.deleteContents();

			const emptyBlock = this.findEmptyBlockForInsertion(range);

			if (emptyBlock) {
				emptyBlock.replaceChildren();
				if (lines[0]) {
					emptyBlock.appendChild(this.createText(lines[0]));
				} else {
					emptyBlock.appendChild(this.createEl('br'));
				}

				let insertAfter: Node = emptyBlock;
				for (let i = 1; i < lines.length; i++) {
					const paragraph = this.createEl('p');
					if (lines[i]) {
						paragraph.appendChild(this.createText(lines[i]));
					} else {
						paragraph.appendChild(this.createEl('br'));
					}
					insertAfter.parentNode?.insertBefore(paragraph, insertAfter.nextSibling);
					insertAfter = paragraph;
				}

				this.selection.setCursorAfter(insertAfter);
				return;
			}

			const fragment = this.window.document.createDocumentFragment();
			for (let i = 0; i < lines.length; i++) {
				const paragraph = this.createEl('p');
				if (lines[i]) {
					paragraph.appendChild(this.createText(lines[i]));
				} else {
					paragraph.appendChild(this.createEl('br'));
				}
				fragment.appendChild(paragraph);
			}

			const lastNode = fragment.lastChild;
			if (!lastNode) return;

			range.insertNode(fragment);
			this.selection.setCursorAfter(lastNode);
		});
	}

	private createCollapsedRangeAtEnd(): Range {
		const range = this.window.document.createRange();
		range.selectNodeContents(this.root);
		range.collapse(false);
		return range;
	}

	private handleFocus(): void {
		const selection = this.window.getSelection();
		const currentRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
		if (currentRange && this.root.contains(currentRange.commonAncestorContainer)) {
			return;
		}
		this.applySelection();
	}
}
