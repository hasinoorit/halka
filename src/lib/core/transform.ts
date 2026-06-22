import type { Editor } from './editor.js';
import { Range as RangeHelpers, clearFormatting } from '../helpers/index.js';

/**
 * Transform API for mutating editor state
 * Provides chainable methods for DOM manipulation
 */
export class Transform {
	constructor(private editor: Editor) {}

	/**
	 * Wrap the current selection in the specified tag
	 */
	wrap(tagName: string): this {
		this.editor.runTransaction(() => {
			this.editor.selection.preserveSelection(() => {
				const element = this.editor.createEl(tagName);
				RangeHelpers.surround(element, this.editor.window);
			});
		});
		return this;
	}

	/**
	 * Remove wrapping tag from selection
	 */
	unwrap(tagName: string): this {
		this.editor.runTransaction(() => {
			const offsets = this.editor.getSelectionOffsets();
			RangeHelpers.undo(tagName, this.editor.window);
			if (offsets && this.editor.window.getSelection()) {
				RangeHelpers.restoreSelectionByOffsets(
					this.editor.window.getSelection()!,
					this.editor.root,
					offsets.start,
					offsets.end
				);
			}
		});
		return this;
	}

	/**
	 * Insert text at the current selection
	 */
	insertText(
		text: string,
		formats?: Set<string>,
		styles?: Map<string, string>
	): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.deleteContents();

			const textNode = this.editor.window.document.createTextNode(text);
			let node: Node = textNode;

			if (styles && styles.size > 0) {
				const span = this.editor.createEl('span');
				for (const [property, value] of styles) {
					span.style.setProperty(property, value);
				}
				span.appendChild(node);
				node = span;
			}

			if (formats && formats.size > 0) {
				for (const tagName of formats) {
					const wrapper = this.editor.createEl(tagName);
					wrapper.appendChild(node);
					node = wrapper;
				}
			}

			range.insertNode(node);
			this.editor.selection.setCursorAt(textNode, text.length);
		});
		return this;
	}

	/**
	 * Insert plain text, splitting an ancestor format so the text is not wrapped by it.
	 */
	insertTextOutsideFormat(text: string, tagName: string): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.deleteContents();

			const textNode = this.editor.window.document.createTextNode(text);
			const wrapper = this.editor.query.findClosest(tagName);

			if (!wrapper || !wrapper.contains(range.startContainer)) {
				range.insertNode(textNode);
				this.editor.selection.setCursorAt(textNode, text.length);
				return;
			}

			const wrapperEl = wrapper as HTMLElement;

			if (range.startContainer.nodeType === Node.TEXT_NODE) {
				const tn = range.startContainer as Text;
				if (!wrapperEl.contains(tn)) {
					range.insertNode(textNode);
					this.editor.selection.setCursorAt(textNode, text.length);
					return;
				}

				const offset = range.startOffset;

				if (offset === 0) {
					wrapperEl.parentNode?.insertBefore(textNode, wrapperEl);
				} else if (offset >= tn.length && !tn.nextSibling) {
					wrapperEl.parentNode?.insertBefore(textNode, wrapperEl.nextSibling);
				} else {
					const after = tn.splitText(offset);
					const tailWrapper = this.editor.createEl(tagName);
					wrapperEl.parentNode?.insertBefore(tailWrapper, wrapperEl.nextSibling);
					tailWrapper.appendChild(after);
					let sibling = after.nextSibling;
					while (sibling) {
						const next = sibling.nextSibling;
						tailWrapper.appendChild(sibling);
						sibling = next;
					}
					wrapperEl.parentNode?.insertBefore(textNode, tailWrapper);
				}
			} else if (range.startContainer === wrapperEl) {
				if (range.startOffset === 0) {
					wrapperEl.parentNode?.insertBefore(textNode, wrapperEl);
				} else {
					wrapperEl.parentNode?.insertBefore(textNode, wrapperEl.nextSibling);
				}
			} else {
				wrapperEl.parentNode?.insertBefore(textNode, wrapperEl.nextSibling);
			}

			this.editor.selection.setCursorAt(textNode, text.length);
		});
		return this;
	}

	/**
	 * Toggle an inline format (mark) on the selection
	 */
	toggleMark(tagName: string): this {
		this.editor.runTransaction(() => {
			// Check if selection is collapsed
			if (this.editor.getRange().collapsed) {
				const tagUpper = tagName.toUpperCase();
				const pending = this.editor.getPendingFormats();
				const suppressed = this.editor.getSuppressedFormats();
				const domActive = this.editor.query.findClosest(tagName) !== null;
				const effectivelyActive =
					pending.has(tagUpper) || (domActive && !suppressed.has(tagUpper));

				if (effectivelyActive) {
					this.editor.removePendingFormat(tagName);
					if (domActive) {
						this.editor.addSuppressedFormat(tagName);
					}
				} else {
					this.editor.removeSuppressedFormat(tagName);
					if (!domActive) {
						this.editor.addPendingFormat(tagName);
					}
				}

				const range = this.editor.getRange();
				this.editor.selection.setCursorAt(range.startContainer, range.startOffset);
				return;
			}

			const isActive = this.editor.query.isActive(tagName);
			const offsets = this.editor.getSelectionOffsets();

			if (isActive) {
				RangeHelpers.undo(tagName, this.editor.window);
			} else {
				const element = this.editor.createEl(tagName);
				RangeHelpers.surround(element, this.editor.window);
			}

			if (offsets && this.editor.window.getSelection()) {
				RangeHelpers.restoreSelectionByOffsets(
					this.editor.window.getSelection()!,
					this.editor.root,
					offsets.start,
					offsets.end
				);
			}
		});
		return this;
	}

	/**
	 * Collapse selection to its end point
	 */
	collapseToEnd(): this {
		this.editor.selection.collapseToEnd();
		return this;
	}

	/**
	 * Collapse selection to its start point
	 */
	collapseToStart(): this {
		this.editor.selection.collapseToStart();
		return this;
	}

	/**
	 * Remove semantic formatting tags from the selection or current block.
	 */
	clearFormatting(): this {
		this.editor.runTransaction(() => {
			const offsets = this.editor.getSelectionOffsets();
			this.editor.selection.preserveSelection(() => {
				clearFormatting({
					root: this.editor.root,
					range: this.editor.getRange(),
					isBlock: (tagName) => this.editor.schema.isBlock(tagName)
				});
			});
			this.editor.clearPendingFormats();
			this.editor.clearSuppressedFormats();
			if (offsets && this.editor.window.getSelection()) {
				RangeHelpers.restoreSelectionByOffsets(
					this.editor.window.getSelection()!,
					this.editor.root,
					offsets.start,
					offsets.end
				);
			}
		});
		return this;
	}

	/**
	 * Remove inline style attributes from the selection or current block.
	 */
	clearStyles(): this {
		this.editor.clearStyles();
		return this;
	}

	/**
	 * Delete the current selection contents
	 */
	deleteSelection(): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.deleteContents();
			range.collapse(true);
			this.editor.selection.setCursorAt(range.startContainer, range.startOffset);
		});
		return this;
	}

	/**
	 * Insert an element at the current selection
	 */
	insertNode(node: Node): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.deleteContents();
			range.insertNode(node);
			this.editor.selection.setCursorAfter(node);
		});
		return this;
	}
}
