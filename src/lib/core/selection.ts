import type { Editor } from './editor.js';
import { isTextNode } from '../helpers/node.js';

/**
 * Enhanced Selection API
 * Provides high-level selection manipulation methods
 */
export class HalkaSelection {
	constructor(private editor: Editor) {}

	/**
	 * Get the native Range object
	 */
	get range(): Range {
		return this.editor.getRange();
	}

	/**
	 * Get the native Selection object
	 */
	get native(): Selection | null {
		return this.editor.window.getSelection();
	}

	/**
	 * Check if selection is collapsed (cursor, not range)
	 */
	get isCollapsed(): boolean {
		return this.range.collapsed;
	}

	/**
	 * Collapse selection to the start of the given node
	 */
	collapseToStart(node?: Node): this {
		this.editor.runTransaction(() => {
			const range = this.range;
			if (node) {
				range.selectNodeContents(node);
				range.collapse(true);
			} else {
				range.collapse(true);
			}
			this.editor.applySelection();
		});
		return this;
	}

	/**
	 * Collapse selection to the end of the given node
	 */
	collapseToEnd(node?: Node): this {
		this.editor.runTransaction(() => {
			const range = this.range;
			if (node) {
				range.selectNodeContents(node);
				range.collapse(false);
			} else {
				range.collapse(false);
			}
			this.editor.applySelection();
		});
		return this;
	}

	/**
	 * Select the entire contents of a node
	 */
	selectAll(node: Node): this {
		this.editor.runTransaction(() => {
			const range = this.range;
			range.selectNodeContents(node);
			this.editor.applySelection();
		});
		return this;
	}

	/**
	 * Move the selection by offset units
	 * @param offset - Number of units to move (positive = forward, negative = backward)
	 * @param unit - 'character' | 'word' | 'line' | 'block'
	 */
	move(offset: number, unit: 'character' | 'word' | 'line' | 'block' = 'character'): this {
		// For now, implement character movement
		// TODO: Implement word, line, block movement
		if (unit === 'character') {
			this.editor.runTransaction(() => {
				const sel = this.native;
				if (!sel) return;

				if (offset > 0) {
					sel.modify('move', 'forward', 'character');
				} else if (offset < 0) {
					sel.modify('move', 'backward', 'character');
				}
			});
		}
		return this;
	}

	/**
	 * Check if selection is at the start of the current block
	 */
	isAtStart(): boolean {
		const range = this.range;
		const block = this.editor.query.getCurrentBlock();
		if (!block) return false;

		const { startContainer, startOffset } = range;

		// If we're at the first text node at offset 0
		if (isTextNode(startContainer)) {
			if (startOffset !== 0) return false;
			// Check if this is the first text node in the block
			const walker = this.editor.window.document.createTreeWalker(
				block,
				NodeFilter.SHOW_TEXT,
				null
			);
			const firstText = walker.nextNode();
			return firstText === startContainer;
		}

		return false;
	}

	/**
	 * Check if selection is at the end of the current block
	 */
	isAtEnd(): boolean {
		const range = this.range;
		const block = this.editor.query.getCurrentBlock();
		if (!block) return false;

		const { endContainer, endOffset } = range;

		// If we're at the last text node at its length
		if (isTextNode(endContainer)) {
			if (endOffset !== endContainer.textContent?.length) return false;
			// Check if this is the last text node in the block
			const walker = this.editor.window.document.createTreeWalker(
				block,
				NodeFilter.SHOW_TEXT,
				null
			);
			let lastText: Node | null = null;
			while (walker.nextNode()) {
				lastText = walker.currentNode;
			}
			return lastText === endContainer;
		}

		return false;
	}

	/**
	 * Expand selection to word boundaries
	 */
	expandTo(unit: 'word' | 'sentence' | 'line' | 'block'): this {
		this.editor.runTransaction(() => {
			const sel = this.native;
			if (!sel) return;

			sel.modify('extend', 'backward', unit);
			sel.modify('extend', 'forward', unit);
		});
		return this;
	}

	/**
	 * Create hidden markers at the start and end of the selection
	 * @returns IDs of the start and end markers
	 */
	createMarkers(): { startId: string; endId: string } | null {
		// Get range directly from window selection to avoid side effects
		const nativeSel = this.editor.window.getSelection();
		if (!nativeSel || nativeSel.rangeCount === 0) return null;
		const liveRange = nativeSel.getRangeAt(0);
		if (!this.editor.root.contains(liveRange.commonAncestorContainer)) return null;

		// Clone so we can work with stable positions without mutating the live range
		const range = liveRange.cloneRange();

		const startId = `start-${Math.random().toString(36).substr(2, 9)}`;
		const endId = `end-${Math.random().toString(36).substr(2, 9)}`;
		const wasCollapsed = range.collapsed;

		const startMarker = this.editor.createEl('span');
		startMarker.id = startId;
		startMarker.dataset.halkaSelectionStart = 'true';
		startMarker.dataset.halkaCollapsed = wasCollapsed ? 'true' : 'false';
		startMarker.style.display = 'none';

		const endMarker = this.editor.createEl('span');
		endMarker.id = endId;
		endMarker.dataset.halkaSelectionEnd = 'true';
		endMarker.dataset.halkaCollapsed = wasCollapsed ? 'true' : 'false';
		endMarker.style.display = 'none';

		// Insert end marker first (at the collapsed-false end of range)
		const endRange = range.cloneRange();
		endRange.collapse(false);
		endRange.insertNode(endMarker);

		// Insert start marker — for collapsed ranges, start === end so we insert
		// relative to the end marker to be safe
		if (wasCollapsed) {
			// Re-use endMarker position as start (they are the same point)
			// Place start marker directly before end marker
			endMarker.parentNode?.insertBefore(startMarker, endMarker);
		} else {
			const startRange = range.cloneRange();
			startRange.collapse(true);
			startRange.insertNode(startMarker);
		}

		return { startId, endId };
	}

	/**
	 * Restore selection from markers and remove them
	 */
	restoreMarkers(ids: { startId: string; endId: string }): void {
		const startMarkerEl = this.editor.root.querySelector(`#${ids.startId}`) as HTMLElement | null;
		const endMarkerEl = this.editor.root.querySelector(`#${ids.endId}`) as HTMLElement | null;

		if (!startMarkerEl || !endMarkerEl) {
			startMarkerEl?.remove();
			endMarkerEl?.remove();
			return;
		}

		// Use the editor's own document — critical for iframe-based editors
		const range = this.editor.window.document.createRange();
		const collapsed = startMarkerEl.dataset.halkaCollapsed === 'true';

		if (collapsed) {
			const leftSibling = startMarkerEl.previousSibling;
			const rightSibling = startMarkerEl.nextSibling;
			if (leftSibling && isTextNode(leftSibling) && leftSibling.textContent) {
				range.setStart(leftSibling, leftSibling.textContent.length);
			} else if (rightSibling && isTextNode(rightSibling)) {
				range.setStart(rightSibling, 0);
			} else {
				range.setStartAfter(startMarkerEl);
			}
			range.collapse(true);
		} else {
			const startSibling = startMarkerEl.nextSibling;
			if (startSibling && isTextNode(startSibling)) {
				range.setStart(startSibling, 0);
			} else {
				range.setStartAfter(startMarkerEl);
			}

			const endSibling = endMarkerEl.previousSibling;
			if (endSibling && isTextNode(endSibling) && endSibling.textContent) {
				range.setEnd(endSibling, endSibling.textContent.length);
			} else {
				range.setEndBefore(endMarkerEl);
			}
		}

		const sel = this.editor.window.getSelection();
		if (sel) {
			sel.removeAllRanges();
			sel.addRange(range);
		}

		startMarkerEl.remove();
		endMarkerEl.remove();
	}

	/**
	 * Execute a callback while preserving selection using markers
	 * Useful for operations that significantly change the DOM structure
	 */
	preserveSelection(callback: () => void): this {
		const markers = this.createMarkers();
		
		try {
			callback();
		} finally {
			if (markers) {
				this.restoreMarkers(markers);
			}
		}
		
		return this;
	}

	/**
	 * Register a normalizer function
	 */
	registerNormalizer(fn: (range: Range) => Range | null): void {
		// Store normalizers in editor or here? 
        // For now, let's assume we store them in HalkaSelection instance or editor.
        // But HalkaSelection is recreated on access in Editor getter unless cached.
        // Wait, Editor getter says: if (!this._selection) this._selection = new ...
        // So it is cached per editor instance.
        
        if (!this._normalizers) {
            this._normalizers = [];
        }
        this._normalizers.push(fn);
	}

    private _normalizers: ((range: Range) => Range | null)[] = [];

	/**
	 * Run all normalizers on the current selection
	 */
	normalize(): void {
        const sel = this.native;
        if (!sel || sel.rangeCount === 0) return;
        
        const originalRange = sel.getRangeAt(0);
        let currentRange = originalRange;
        let modified = false;

        for (const normalizer of this._normalizers) {
            const result = normalizer(currentRange);
            if (result) {
                currentRange = result;
                modified = true;
            }
        }

        if (modified) {
            sel.removeAllRanges();
            sel.addRange(currentRange);
        }
	}
}
