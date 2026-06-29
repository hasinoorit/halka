import { describe, it, expect } from 'vitest';
import { normalizeExternalHTML } from '../../lib/helpers/paste-normalize.js';

describe('normalizeExternalHTML', () => {
	it('unwraps Word fake-bold elements', () => {
		const doc = new DOMParser().parseFromString(
			'<p><b style="font-weight:normal">Not bold</b> <b style="font-weight:bold">Bold</b></p>',
			'text/html'
		);

		normalizeExternalHTML(doc);

		expect(doc.body.innerHTML).toContain('Not bold');
		expect(doc.body.innerHTML).not.toContain('font-weight:normal');
		expect(doc.body.querySelectorAll('b').length).toBe(1);
	});

	it('converts MsoNormal class blocks to paragraphs', () => {
		const doc = new DOMParser().parseFromString(
			'<div class="MsoNormal">Word paragraph</div>',
			'text/html'
		);

		normalizeExternalHTML(doc);

		expect(doc.body.innerHTML).toBe('<p>Word paragraph</p>');
	});

	it('removes empty Office o:p elements', () => {
		const doc = new DOMParser().parseFromString('<p>Text<o:p></o:p></p>', 'text/html');

		normalizeExternalHTML(doc);

		expect(doc.body.innerHTML).toBe('<p>Text</p>');
	});
});
