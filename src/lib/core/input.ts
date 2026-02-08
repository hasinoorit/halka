import type { Editor } from './editor.js';

export class InputManager {
	constructor(private editor: Editor) {
		this.init();
	}

	private init() {
		this.editor.root.addEventListener('beforeinput', this.handleBeforeInput.bind(this));
	}

	private handleBeforeInput(event: InputEvent) {
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

	destroy() {
		this.editor.root.removeEventListener('beforeinput', this.handleBeforeInput.bind(this));
	}
}
