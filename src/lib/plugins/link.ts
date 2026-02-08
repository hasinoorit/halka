import { Range as RangeHelpers, Node as NodeHelpers } from '../helpers/index.js';
import { type Editor, definePlugin } from '../core/editor.js';

type LinkCommandPayload = {
	href?: string;
	target?: string;
	rel?: string;
};

const getActiveLinkElement = (editor: Editor): HTMLAnchorElement | null => {
	const el = editor.query.findClosest('A');
	return el instanceof HTMLAnchorElement ? el : null;
};

const toggleLinkForSelection = (editor: Editor, payload?: unknown): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();
		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		const selection = editor.getSelection();
		if (!selection) return;

		const existingLink = getActiveLinkElement(editor);

		if (existingLink) {
			RangeHelpers.unwrapWith('A', editor.window);
			return;
		}

		if (range.collapsed) {
			return;
		}

		const a = editor.createEl('a');

		const data = (payload ?? {}) as LinkCommandPayload;
		const href = typeof data.href === 'string' && data.href.trim() ? data.href.trim() : undefined;
		const target = typeof data.target === 'string' ? data.target : undefined;
		const rel = typeof data.rel === 'string' ? data.rel : undefined;

		a.href = href ?? '#';

		if (target !== undefined) {
			a.target = target;
		}

		if (rel !== undefined) {
			a.rel = rel;
		}

		RangeHelpers.surround(a, editor.window);

		const newRange = editor.window.document.createRange();
		newRange.selectNodeContents(a);
		selection.removeAllRanges();
		selection.addRange(newRange);
	});
};

const updateLinkAtSelection = (editor: Editor, payload?: unknown): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();

		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		const link = getActiveLinkElement(editor);
		if (!link) {
			return;
		}

		const data = (payload ?? {}) as LinkCommandPayload;

		if (typeof data.href === 'string' && data.href.trim()) {
			link.setAttribute('href', data.href.trim());
		}

		if (data.target !== undefined) {
			if (data.target) {
				link.setAttribute('target', data.target);
			} else {
				link.removeAttribute('target');
			}
		}

		if (data.rel !== undefined) {
			if (data.rel) {
				link.setAttribute('rel', data.rel);
			} else {
				link.removeAttribute('rel');
			}
		}
	});
};

const unlinkAtSelection = (editor: Editor): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();

		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		const link = getActiveLinkElement(editor);
		if (!link) {
			return;
		}

		RangeHelpers.unwrapWith('A', editor.window);
	});
};

export const linkPlugin = definePlugin({
	name: 'link',
	commands: {
		'link.toggle': (editor, payload) => {
			toggleLinkForSelection(editor, payload);
		},
		'link.update': (editor, payload) => {
			updateLinkAtSelection(editor, payload);
		},
		'link.unlink': (editor) => {
			unlinkAtSelection(editor);
		}
	}
});
