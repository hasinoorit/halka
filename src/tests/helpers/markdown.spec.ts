import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../../lib/helpers/markdown.js';

describe('markdownToHtml', () => {
	it('parses h4-h6 headings', () => {
		const html = markdownToHtml('#### H4\n##### H5\n###### H6');
		expect(html).toContain('<h4>H4</h4>');
		expect(html).toContain('<h5>H5</h5>');
		expect(html).toContain('<h6>H6</h6>');
	});

	it('parses GFM tables', () => {
		const markdown = `| Name | Score |
| --- | --- |
| Ada | 95 |
| Bob | 88 |`;

		const html = markdownToHtml(markdown);
		expect(html).toContain('<table>');
		expect(html).toContain('<thead>');
		expect(html).toContain('<th>Name</th>');
		expect(html).toContain('<td>Ada</td>');
		expect(html).toContain('<td>88</td>');
	});

	it('parses remote markdown images', () => {
		const html = markdownToHtml('![Alt text](https://example.com/image.jpg)');
		expect(html).toContain('<img src="https://example.com/image.jpg" alt="Alt text">');
	});

	it('does not parse data URL markdown images', () => {
		const html = markdownToHtml('![](data:image/png;base64,abc)');
		expect(html).not.toContain('<img');
		expect(html).toContain('data:image/png;base64,abc');
	});

	it('parses nested lists', () => {
		const markdown = `- parent
  - child one
  - child two
- sibling`;

		const html = markdownToHtml(markdown);
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>parent<ul><li>child one</li><li>child two</li></ul></li>');
		expect(html).toContain('<li>sibling</li>');
	});
});
