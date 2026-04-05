/* eslint-disable @typescript-eslint/no-explicit-any */
import { Range as RangeHelpers, Node as NodeHelpers } from '../helpers/index.js';
import { Schema } from './schema.js';
import { Query } from './query.js';
import { Transform } from './transform.js';
import { HalkaSelection } from './selection.js';
import { InputManager } from './input.js';

export type HalkaPlugin = (editor: Editor) => () => void;

export type HalkaDeclarativePlugin = {
	name: string;
	commands?: Record<string, (editor: Editor, payload?: unknown) => void>;
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
	change: string;
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
	private _inputManager: InputManager;

	constructor(root: HTMLElement) {
		this.root = root;
		this.schema = new Schema();
		this._pendingFormats = new Set();
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

	abstract getHTML(): string;
	abstract setHTML(html: string): void;
	abstract insertHTML(html: string): void;
	abstract insertText(text: string): void;
	abstract getSelection(): Selection | null;
	abstract getRange(): Range;
	abstract setSelection(range: Range): void;
	abstract setInlineStyle(style: string, value?: string): void;
	abstract setBlockStyle(style: string, value?: string): void;
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
	abstract runTransaction(cb: (editor: Editor) => void): void;
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
	private savedSelectionRange: Range | undefined;
	private savedSelectionOffsets: { start: number; end: number } | undefined;
	private activeFormats: Record<string, boolean> = {};
	private activeStyles: Record<string, string> = {};

	constructor(root: HTMLElement, options: HalkaOptions = {}) {
		super(root);
		this.options = {
			shortcuts: options.shortcuts ?? true,
			plugins: options.plugins ?? []
		};

		if (!this.root.isContentEditable) {
			this.root.contentEditable = 'true';
		}

		this.handleKeydownBound = (event) => this.handleKeydown(event);
		this.handleSelectionChangeBound = () => this.updateActiveFormatsAndStyles();
		this.handleBlurBound = () => this.saveSelection();
		this.handleFocusBound = () => this.handleFocus();

		if (this.options.shortcuts) {
			this.root.addEventListener('keydown', this.handleKeydownBound);
			this.onShortcut('mod+b', () => this.toggleInlineFormat('bold'));
			this.onShortcut('mod+i', () => this.toggleInlineFormat('italic'));
			this.onShortcut('mod+u', () => this.toggleInlineFormat('underline'));
		}

		document.addEventListener('selectionchange', this.handleSelectionChangeBound);
		this.root.addEventListener('blur', this.handleBlurBound);
		this.root.addEventListener('focus', this.handleFocusBound);

		this.pluginCleanups = (this.options.plugins ?? []).map((plugin) => plugin(this));
		this.registerDefaultNormalizers();
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

		this.emit('change', this.getHTML());
	}

	hasFormat(format: string): boolean {
		const tagName = this.getInlineTagName(format) || this.getBlockTagName(format);
		return !!(tagName && this.activeFormats[tagName.toUpperCase()]);
	}

	getStyle(property: string): string | undefined {
		return this.activeStyles[property];
	}

	getHTML(): string {
		return this.root.innerHTML;
	}

	setHTML(html: string): void {
		this.runTransaction((editor) => {
			(editor as HalkaEditor).root.innerHTML = html;
			this.savedSelectionRange = undefined;
			this.savedSelectionOffsets = undefined;
			const selection = this.window.getSelection();
			if (selection) selection.removeAllRanges();
		});
	}

	insertHTML(html: string): void {
		this.runTransaction(() => {
			const selection = this.getSelection();
			if (!selection) return;

			const range = selection.getRangeAt(0);
			range.deleteContents();
			const fragment = range.createContextualFragment(html);
			
			// We need to find the last inserted node to set cursor after it
			const lastNode = fragment.lastChild;
			if (!lastNode) return;
			
			range.insertNode(fragment);
			this.selection.setCursorAfter(lastNode);
		});
	}

	insertText(text: string): void {
		this.runTransaction(() => {
			const selection = this.getSelection();
			if (!selection) return;

			const range = selection.getRangeAt(0);
			range.deleteContents();
			const textNode = document.createTextNode(text);
			range.insertNode(textNode);

			this.selection.setCursorAfter(textNode);
		});
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

		// Update internal saved state as well so that subsequent restorations
		// use the new position.
		this.savedSelectionRange = range.cloneRange();
		this.savedSelectionOffsets = this.computeSelectionOffsets(range);
	}

	getSelectionOffsets(): { start: number; end: number } | undefined {
		return this.savedSelectionOffsets;
	}

	setSelectionOffsets(offsets: { start: number; end: number }): void {
		this.savedSelectionOffsets = offsets;
	}

	setInlineStyle(style: string, value?: string): void {
		this.runTransaction(() => {
			const range = this.getRange();

			const selectedElement = RangeHelpers.isSelectedAnElement(range);
			let span: HTMLElement | null = null;

			if (selectedElement instanceof HTMLElement && selectedElement.tagName === 'SPAN') {
				span = selectedElement;
			} else {
				const node = range.commonAncestorContainer;
				const element =
					node instanceof HTMLElement
						? node
						: node.parentElement instanceof HTMLElement
							? node.parentElement
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

			if (value === undefined) return;

			const element = this.createEl('span');
			element.style.setProperty(style, value);
				RangeHelpers.surround(element, this.window);
		});
	}

	setBlockStyle(style: string, value?: string): void {
		this.runTransaction(() => {
			this.selection.preserveSelection(() => {
			const range = this.getRange();
			let element =
				range.commonAncestorContainer instanceof HTMLElement
					? range.commonAncestorContainer
					: range.commonAncestorContainer.parentElement;

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

	toggleInlineFormat(format: string): void {
		const tagName = this.getInlineTagName(format);
		if (!tagName) return;
		// Use the new transforms API
		this.transforms.toggleMark(tagName);
	}

	toggleBlockFormat(format: string): void {
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
		if (this.root.innerHTML.trim() === '') {
			this.root.innerHTML = '<p><br></p>';
			return;
		}
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

	runTransaction(cb: (editor: Editor) => void): void {
		const beforeHTML = this.getHTML();
		
		const currentSelection = this.window.getSelection();
		const hasActiveSelection = currentSelection && 
			currentSelection.rangeCount > 0 && 
			this.root.contains(currentSelection.getRangeAt(0).commonAncestorContainer);

		this.root.focus();
		
		if (!hasActiveSelection && (this.savedSelectionRange || this.savedSelectionOffsets)) {
			this.applySelection(true);
		}
		
		cb(this);

		let merged = false;
		try {
			const range = this.getRange();
			if (range) {
				let currentNode = range.commonAncestorContainer;

				if (currentNode.nodeType === Node.TEXT_NODE) {
					currentNode = currentNode.parentElement || currentNode;
				}

				if (this.root.contains(currentNode)) {
					// Deep merge inside the container
					if (NodeHelpers.mergeAdjacentChildren(currentNode, true)) {
						merged = true;
					}

					// Walk up while ancestors cover only this container
					while (
						currentNode.parentElement &&
						currentNode.parentElement !== this.root &&
						currentNode.parentElement.childElementCount === 1
					) {
						currentNode = currentNode.parentElement;
					}

					// Normalize the parent if it's within root
					if (currentNode.parentElement && this.root.contains(currentNode.parentElement)) {
						// Only merge siblings at this level, don't recurse deeply into other branches
						if (NodeHelpers.mergeAdjacentChildren(currentNode.parentElement, true)) {
							merged = true;
						}
					}
				}
			}
		} catch (e) {
			console.error('Error during node merging:', e);
		}

		const afterHTML = this.getHTML();
		if (afterHTML !== beforeHTML) {
			this.normalizeHTML();
			this.emit('change', this.getHTML());
		}
	}

	destroy(): void {
		if (this.options.shortcuts) {
			this.root.removeEventListener('keydown', this.handleKeydownBound);
		}

		document.removeEventListener('selectionchange', this.handleSelectionChangeBound);
		this.root.removeEventListener('blur', this.handleBlurBound);
		// Use stored bound reference — anonymous arrow in old code was never removable
		this.root.removeEventListener('focus', this.handleFocusBound);

		for (const cleanup of this.pluginCleanups) {
			cleanup();
		}

		this.listeners.clear();
		this.shortcutListeners.clear();
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
		// Count only editable text: skip contenteditable=false subtrees so that
		// save and restore offsets are symmetric with findTextPositionAtOffset.
		const countEditableText = (node: Node): number => {
			if (node instanceof HTMLElement && node.getAttribute('contenteditable') === 'false') {
				return 0;
			}
			if (node.nodeType === Node.TEXT_NODE) {
				return (node as Text).data.length;
			}
			let total = 0;
			for (let i = 0; i < node.childNodes.length; i++) {
				total += countEditableText(node.childNodes[i]);
			}
			return total;
		};

		const startRange = range.cloneRange();
		startRange.selectNodeContents(this.root);
		startRange.setEnd(range.startContainer, range.startOffset);
		const start = countEditableText(startRange.cloneContents());

		const endRange = range.cloneRange();
		endRange.selectNodeContents(this.root);
		endRange.setEnd(range.endContainer, range.endOffset);
		const end = countEditableText(endRange.cloneContents());
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

			let targetLi = listContainer.querySelector('li');
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

	private createCollapsedRangeAtEnd(): Range {
		const range = document.createRange();
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
