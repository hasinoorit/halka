import type { Editor } from './editor.js';

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
		if (this.editor.inline) {
			if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
				event.preventDefault();
				return;
			}

			if (event.inputType === 'insertText' && event.data && /[\r\n]/.test(event.data)) {
				event.preventDefault();
				const text = event.data.replace(/[\r\n]+/g, ' ');
				if (text) {
					this.insertTextWithFormats(text);
				}
				return;
			}
		} else if (event.inputType === 'insertText' && event.data && /[\r\n]/.test(event.data)) {
			event.preventDefault();
			this.insertTextWithFormats(event.data);
			return;
		}

		if (event.inputType === 'insertText' && event.data) {
			const sel = this.editor.getSelection();
			if (sel && sel.rangeCount > 0) {
				const range = sel.getRangeAt(0);
				if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
					const tn = range.startContainer as Text;
					const offset = range.startOffset;
					let idx = -1;
					if (offset > 0 && tn.data.charAt(offset - 1) === '\u200B') {
						idx = offset - 1;
					} else if (offset < tn.length && tn.data.charAt(offset) === '\u200B') {
						idx = offset;
					}
					if (idx !== -1) {
						event.preventDefault();
						tn.data = tn.data.slice(0, idx) + event.data + tn.data.slice(idx + 1);
						const newRange = this.editor.window.document.createRange();
						newRange.setStart(tn, idx + event.data.length);
						newRange.collapse(true);
						sel.removeAllRanges();
						sel.addRange(newRange);
						return;
					}
				}
			}

			const pendingFormats = this.editor.getPendingFormats();
			if (pendingFormats.size > 0) {
				event.preventDefault();
				this.editor.transforms.insertText(event.data, pendingFormats);
				this.editor.clearPendingFormats();
			}
		}
	}

	private insertTextWithFormats(text: string): void {
		const pendingFormats = this.editor.getPendingFormats();
		if (pendingFormats.size > 0) {
			this.editor.transforms.insertText(text, pendingFormats);
			this.editor.clearPendingFormats();
		} else {
			this.editor.insertText(text);
		}
	}

	destroy() {
		this.editor.root.removeEventListener('beforeinput', this.boundHandleBeforeInput);
		this.editor.root.removeEventListener('input', this.boundHandleInput);
	}
}
