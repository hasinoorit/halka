import type { Editor } from './editor.js';
import { getParentElements } from '../helpers/node.js';

/**
 * Query API for reading editor state
 * Provides high-level methods for inspecting the DOM
 */
export class Query {
	constructor(private editor: Editor) {}

	/**
	 * Check if a tag name represents a block-level element
	 */
	isBlock(tagName: string): boolean {
		return this.editor.schema.isBlock(tagName);
	}

	/**
	 * Check if a tag name represents an inline element
	 */
	isInline(tagName: string): boolean {
		return this.editor.schema.isInline(tagName);
	}

	/**
	 * Check if a tag name represents a void element
	 */
	isVoid(tagName: string): boolean {
		return this.editor.schema.isVoid(tagName);
	}

	/**
	 * Find the closest ancestor element with the given tag name
	 */
	findClosest(tagName: string): Element | null {
		const range = this.editor.getRange();
		const targetTag = tagName.toUpperCase();
		const ancestors = getParentElements(range.commonAncestorContainer);

		for (const ancestor of ancestors) {
			if (ancestor instanceof Element && ancestor.tagName === targetTag) {
				return ancestor;
			}
		}

		return null;
	}

	/**
	 * Find a node in the ancestor path that matches the predicate
	 */
	matchPath(predicate: (node: Node) => boolean): Node | null {
		const range = this.editor.getRange();
		const ancestors = getParentElements(range.commonAncestorContainer);

		for (const ancestor of ancestors) {
			if (predicate(ancestor)) {
				return ancestor;
			}
		}

		return null;
	}

	/**
	 * Check if a format (tag) is active at the current selection
	 */
	isActive(tagName: string): boolean {
		// If selection is collapsed, check pending formats first
		const range = this.editor.getRange();
		if (range.collapsed) {
			const pending = this.editor.getPendingFormats();
			// If we have pending formats, trust them (state based)
			if (pending.size > 0) {
				return pending.has(tagName.toUpperCase());
			}
			// Otherwise fallback to DOM check
		}
		return this.findClosest(tagName) !== null;
	}

	/**
	 * Get the current block element at selection
	 */
	getCurrentBlock(): Element | null {
		const range = this.editor.getRange();
		const ancestors = getParentElements(range.commonAncestorContainer);

		for (const ancestor of ancestors) {
			if (
				ancestor instanceof Element &&
				this.editor.schema.isBlock(ancestor.tagName) &&
				ancestor !== this.editor.root
			) {
				return ancestor;
			}
		}

		return null;
	}
}
