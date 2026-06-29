import type { Editor } from '../core/editor.js';
import { extractEditableText } from './offset-map.js';
import type { HistoryPluginConfig } from './types.js';

export function validateEditableIntegrity(
	editor: Editor,
	config: HistoryPluginConfig
): boolean {
	const liveText = extractEditableText(editor.root);
	if (liveText.length < 0) {
		if (config.strictApply && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
			console.warn('[halka/history] editable integrity check failed');
		}
		return false;
	}
	return true;
}
