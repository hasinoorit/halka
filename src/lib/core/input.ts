import type { Editor } from './editor.js';
import { handleDeleteContentBackward } from './block-delete.js';

const ZWS = '\u200B';

export class InputManager {
	private boundHandleBeforeInput: (event: InputEvent) => void;
	private boundHandleInput: () => void;

	constructor(private editor: Editor) {
		this.boundHandleBeforeInput = this.handleBeforeInput.bind(this);
		this.boundHandleInput = this.handleInput.bind(this);
		this.init();
	}

	private init() {
		this.editor.root.addEventListener('beforeinput', this.boundHandleBeforeInput);
		this.editor.root.addEventListener('input', this.boundHandleInput);
	}

	private handleInput() {
		this.editor.ensureDocumentStructure();
		this.editor.reportContentChangeIfNeeded();
	}

	private handleBeforeInput(event: InputEvent) {
		if (event.inputType === 'deleteContentBackward') {
			if (handleDeleteContentBackward(this.editor, event)) {
				return;
			}
		}

		if (this.editor.inline) {
			if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
				event.preventDefault();
				return;
			}

			if (event.inputType === 'insertText' && event.data && /[\r\n]/.test(event.data)) {
				event.preventDefault();
				const text = event.data.replace(/[\r\n]+/g, ' ');
				if (text) {
					this.insertTextWithPending(text);
				}
				return;
			}
		} else if (event.inputType === 'insertText' && event.data && /[\r\n]/.test(event.data)) {
			event.preventDefault();
			this.insertTextWithPending(event.data);
			return;
		}

		if (event.inputType === 'insertText' && event.data) {
			if (this.tryReplaceZws(event)) {
				return;
			}

			const pendingFormats = this.editor.getPendingFormats();
			const pendingStyles = this.editor.getPendingStyles();
			if (pendingFormats.size > 0 || pendingStyles.size > 0) {
				event.preventDefault();
				this.insertTextWithPending(event.data);
				return;
			}

			const suppressedTag = this.getSuppressedFormatAtCaret();
			if (suppressedTag) {
				event.preventDefault();
				this.editor.transforms.insertTextOutsideFormat(event.data, suppressedTag);
				return;
			}

			if (this.tryInsertAdjacentZwsSpan(event)) {
				return;
			}
		}
	}

	private getSuppressedFormatAtCaret(): string | null {
		const suppressed = this.editor.getSuppressedFormats();
		if (suppressed.size === 0) return null;

		for (const tagName of suppressed) {
			if (this.editor.query.findClosest(tagName) !== null) {
				return tagName;
			}
		}

		return null;
	}

	private insertTextWithPending(text: string): void {
		const pendingFormats = this.editor.getPendingFormats();
		const pendingStyles = this.editor.getPendingStyles();
		if (pendingFormats.size > 0 || pendingStyles.size > 0) {
			this.editor.transforms.insertText(text, pendingFormats, pendingStyles);
			this.editor.clearPendingFormats();
			this.editor.clearPendingStyles();
		} else {
			this.editor.insertText(text);
		}
	}

	private tryReplaceZws(event: InputEvent): boolean {
		if (!event.data) return false;

		const sel = this.editor.getSelection();
		if (!sel || sel.rangeCount === 0) return false;

		const range = sel.getRangeAt(0);
		if (!range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) {
			return false;
		}

		const tn = range.startContainer as Text;
		const offset = range.startOffset;
		let idx = -1;

		if (offset > 0 && tn.data.charAt(offset - 1) === ZWS) {
			idx = offset - 1;
		} else if (offset < tn.length && tn.data.charAt(offset) === ZWS) {
			idx = offset;
		}

		if (idx === -1) return false;

		event.preventDefault();
		tn.data = tn.data.slice(0, idx) + event.data + tn.data.slice(idx + 1);
		const newRange = this.editor.window.document.createRange();
		newRange.setStart(tn, idx + event.data.length);
		newRange.collapse(true);
		sel.removeAllRanges();
		sel.addRange(newRange);
		this.editor.setSelection(newRange);
		return true;
	}

	private tryInsertAdjacentZwsSpan(event: InputEvent): boolean {
		if (!event.data) return false;

		const sel = this.editor.getSelection();
		if (!sel || sel.rangeCount === 0) return false;

		const range = sel.getRangeAt(0);
		if (!range.collapsed || range.startContainer.nodeType !== Node.ELEMENT_NODE) {
			return false;
		}

		const container = range.startContainer as HTMLElement;
		const offset = range.startOffset;
		if (offset === 0) return false;

		const prev = container.childNodes[offset - 1];
		if (prev?.nodeType !== Node.ELEMENT_NODE) return false;

		const element = prev as HTMLElement;
		const textNode = this.findZwsOnlyTextNode(element);
		if (!textNode) return false;

		event.preventDefault();
		textNode.data = event.data;
		const newRange = this.editor.window.document.createRange();
		newRange.setStart(textNode, event.data.length);
		newRange.collapse(true);
		sel.removeAllRanges();
		sel.addRange(newRange);
		this.editor.setSelection(newRange);
		return true;
	}

	private findZwsOnlyTextNode(element: HTMLElement): Text | null {
		if (element.childNodes.length !== 1) return null;
		const child = element.firstChild;
		if (child?.nodeType !== Node.TEXT_NODE) return null;
		const text = child as Text;
		return text.data === ZWS ? text : null;
	}

	destroy() {
		this.editor.root.removeEventListener('beforeinput', this.boundHandleBeforeInput);
		this.editor.root.removeEventListener('input', this.boundHandleInput);
	}
}
