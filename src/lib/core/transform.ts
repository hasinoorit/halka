import type { Editor } from './editor.js';
import { Range as RangeHelpers } from '../helpers/index.js';

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
	insertText(text: string, formats?: Set<string>): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.deleteContents();

			let node: Node = this.editor.window.document.createTextNode(text);

			// Wrap text in formats if provided
			if (formats && formats.size > 0) {
				// Create elements for each format
				for (const tagName of formats) {
					const wrapper = this.editor.createEl(tagName);
					wrapper.appendChild(node);
					node = wrapper;
				}
			}

			range.insertNode(node);
			this.editor.selection.setCursorAfter(node);
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
				// Explicit DOM-active check for current caret context
				const domActive = this.editor.query.findClosest(tagName) !== null;

				// If caret is inside active DOM mark, break out so next typed char is unformatted
				if (domActive) {
					RangeHelpers.undo(tagName, this.editor.window);
					if (pending.has(tagUpper)) {
						this.editor.removePendingFormat(tagName);
					}
					
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
					this.editor.selection.collapseToEnd();
					return;
				}

				// Otherwise toggle virtual pending format without DOM change
				if (pending.has(tagUpper)) {
					this.editor.removePendingFormat(tagName);
				} else {
					this.editor.addPendingFormat(tagName);
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
	 * Delete the current selection contents
	 */
	deleteSelection(): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			const startNode = range.startContainer;
			const startOffset = range.startOffset;
			range.deleteContents();
			this.editor.selection.setCursorAt(startNode, startOffset);
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
