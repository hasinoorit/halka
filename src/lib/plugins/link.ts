import { Range as RangeHelpers, Node as NodeHelpers, isElementNode } from '../helpers/index.js';
import { type Editor, definePlugin } from '../core/editor.js';

type LinkCommandPayload = {
	href?: string;
	target?: string;
	rel?: string;
};

const getActiveLinkElement = (editor: Editor): HTMLAnchorElement | null => {
	const el = editor.query.findClosest('A');
	return (isElementNode(el) && el.tagName === 'A') ? el as HTMLAnchorElement : null;
};

const toggleLinkForSelection = (editor: Editor, payload?: unknown): void => {
	editor.runTransaction(() => {
		const range = editor.getRange();
		if (NodeHelpers.isInsideReadonly(range.commonAncestorContainer)) {
			return;
		}

		const selection = editor.getSelection();
		if (!selection) return;

		const data = (payload ?? {}) as LinkCommandPayload;
		const href = typeof data.href === 'string' ? data.href.trim() : undefined;

		const existingLink = getActiveLinkElement(editor);

		if (existingLink) {
			if (href === '') {
				editor.selection.preserveSelection(() => {
					RangeHelpers.unwrapWith('A', editor.window);
				});
				return;
			}
			
			if (href) existingLink.href = href;
			if (typeof data.target === 'string') {
				if (data.target) existingLink.target = data.target;
				else existingLink.removeAttribute('target');
			}
			if (typeof data.rel === 'string') {
				if (data.rel) existingLink.rel = data.rel;
				else existingLink.removeAttribute('rel');
			}
			return;
		}

		// Don't create empty links
		if (!href) return;

		// Even if collapsed, RangeHelpers.surround will handle it by inserting a zero-width space
		// if the user wants to insert a link at the cursor and type.

		const a = editor.createEl('a');

		const target = typeof data.target === 'string' ? data.target : undefined;
		const rel = typeof data.rel === 'string' ? data.rel : undefined;

		a.href = href;

		if (target !== undefined) {
			a.target = target;
		}

		if (rel !== undefined) {
			a.rel = rel;
		}

		editor.selection.preserveSelection(() => {
			RangeHelpers.surround(a, editor.window, editor.getRange());
		});
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
		const href = typeof data.href === 'string' ? data.href.trim() : undefined;

		if (href === '') {
			editor.selection.preserveSelection(() => {
				RangeHelpers.unwrapWith('A', editor.window);
			});
			return;
		}

		if (href) {
			link.setAttribute('href', href);
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

		editor.selection.preserveSelection(() => {
			RangeHelpers.unwrapWith('A', editor.window);
		});
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
	},
	states: {
		'link.active': (editor) => {
			const link = getActiveLinkElement(editor);
			if (!link) return null;
			return {
				href: link.getAttribute('href') || '',
				target: link.getAttribute('target') || '',
				rel: link.getAttribute('rel') || ''
			};
		}
	}
});
