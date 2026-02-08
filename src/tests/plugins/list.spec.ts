import { describe, it, expect } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { listPlugin } from '../../lib/plugins/list.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

describe('listPlugin', () => {
	it('registers without throwing', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false, plugins: [listPlugin] });

		expect(editor).toBeTruthy();

		document.body.removeChild(root);
		editor.destroy();
	});
});

