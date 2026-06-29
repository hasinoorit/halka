import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { createHistoryPlugin } from '../../lib/plugins/history.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

describe('HistoryManager', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('caps undo stack at maxSteps', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, {
			shortcuts: false,
			plugins: [createHistoryPlugin({ maxSteps: 2, mergeMs: 5000 })]
		});

		for (let i = 1; i <= 4; i++) {
			editor.setHTML(`<p>${i}</p>`);
			vi.advanceTimersByTime(5001);
		}

		expect(editor.getState('history.stackDepth')).toBeLessThanOrEqual(2);

		document.body.removeChild(root);
		editor.destroy();
	});
});
