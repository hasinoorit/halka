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
			const element = this.editor.createEl(tagName);
			RangeHelpers.surround(element, this.editor.window);
		});
		return this;
	}

	/**
	 * Remove wrapping tag from selection
	 */
	unwrap(tagName: string): this {
		this.editor.runTransaction(() => {
			RangeHelpers.undo(tagName, this.editor.window);
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
			range.setStartAfter(node);
			range.setEndAfter(node);
			this.editor.applySelection();
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
					{
						const range = this.editor.getRange();
						range.collapse(false);
					}
					this.editor.applySelection();
					this.editor.window.setTimeout(() => {
						this.editor.root.focus();
						this.editor.applySelection();
					}, 0);
					return;
				}

				// Otherwise toggle virtual pending format without DOM change
				if (pending.has(tagUpper)) {
					this.editor.removePendingFormat(tagName);
				} else {
					this.editor.addPendingFormat(tagName);
				}
				{
					const range = this.editor.getRange();
					range.collapse(false);
				}
				this.editor.applySelection();
				this.editor.window.setTimeout(() => {
					this.editor.root.focus();
					this.editor.applySelection();
				}, 0);
				return;
			}

			const isActive = this.editor.query.isActive(tagName);
			if (isActive) {
				RangeHelpers.undo(tagName, this.editor.window);
			} else {
				const element = this.editor.createEl(tagName);
				RangeHelpers.surround(element, this.editor.window);
			}
		});
		return this;
	}

	/**
	 * Collapse selection to its end point
	 */
	collapseToEnd(): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.collapse(false);
			this.editor.applySelection();
		});
		return this;
	}

	/**
	 * Collapse selection to its start point
	 */
	collapseToStart(): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.collapse(true);
			this.editor.applySelection();
		});
		return this;
	}

	/**
	 * Delete the current selection contents
	 */
	deleteSelection(): this {
		this.editor.runTransaction(() => {
			const range = this.editor.getRange();
			range.deleteContents();
			this.editor.applySelection();
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
			range.setStartAfter(node);
			range.setEndAfter(node);
			this.editor.applySelection();
		});
		return this;
	}
}
