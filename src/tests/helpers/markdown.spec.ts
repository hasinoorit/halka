import { describe, it, expect } from 'vitest';
import { markdownToHtml, parseInlineMarkdown } from '../../lib/helpers/markdown.js';

describe('markdownToHtml', () => {
	it('converts headings', () => {
		expect(markdownToHtml('# Title')).toBe('<h1>Title</h1>');
		expect(markdownToHtml('## Subtitle')).toBe('<h2>Subtitle</h2>');
	});

	it('converts inline formatting', () => {
		expect(parseInlineMarkdown('**bold** and *italic*')).toBe(
			'<strong>bold</strong> and <em>italic</em>'
		);
		expect(parseInlineMarkdown('`code` and ~~strike~~')).toBe(
			'<code>code</code> and <s>strike</s>'
		);
	});

	it('converts links', () => {
		expect(parseInlineMarkdown('[Halka](https://example.com)')).toBe(
			'<a href="https://example.com">Halka</a>'
		);
	});

	it('converts blockquote, lists, and paragraphs', () => {
		const markdown = '> Quote\n\n- one\n- two\n\nPlain text';
		const html = markdownToHtml(markdown);

		expect(html).toContain('<blockquote><p>Quote</p></blockquote>');
		expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
		expect(html).toContain('<p>Plain text</p>');
	});

	it('converts fenced code blocks', () => {
		const markdown = '```\nconst x = 1;\n```';
		expect(markdownToHtml(markdown)).toBe('<pre><code>const x = 1;</code></pre>');
	});

	it('converts horizontal rules', () => {
		expect(markdownToHtml('---')).toBe('<hr>');
		expect(markdownToHtml('***')).toBe('<hr>');
		expect(markdownToHtml('___')).toBe('<hr>');
		expect(markdownToHtml('Above\n\n---\n\nBelow')).toBe('<p>Above</p><hr><p>Below</p>');
	});

	it('does not italicize underscores inside words', () => {
		expect(parseInlineMarkdown('file_name.txt')).toBe('file_name.txt');
	});
});
