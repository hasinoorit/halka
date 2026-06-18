function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function sanitizeHref(href: string): string {
	const trimmed = href.trim();
	if (/^javascript:/i.test(trimmed)) return '#';
	return trimmed;
}

export function parseInlineMarkdown(text: string): string {
	let result = escapeHtml(text);

	result = result.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		(_match, label: string, href: string) => `<a href="${sanitizeHref(href)}">${label}</a>`
	);
	result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
	result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
	result = result.replace(/`([^`]+?)`/g, '<code>$1</code>');
	result = result.replace(/(?<![a-zA-Z0-9*])\*([^*]+?)\*(?![a-zA-Z0-9*])/g, '<em>$1</em>');
	result = result.replace(/(?<![a-zA-Z0-9])_([^_]+?)_(?![a-zA-Z0-9])/g, '<em>$1</em>');

	return result;
}

export function isHorizontalRule(line: string): boolean {
	const trimmed = line.trim();
	return /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed);
}

function isBlockStart(line: string): boolean {
	if (!line.trim()) return false;

	return (
		isHorizontalRule(line) ||
		/^#{1,3}\s/.test(line) ||
		line.startsWith('>') ||
		/^[-*]\s/.test(line) ||
		/^\d+\.\s/.test(line) ||
		line.trim().startsWith('```')
	);
}

export function markdownToHtml(text: string): string {
	const lines = text.replace(/\r\n/g, '\n').split('\n');
	const blocks: string[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (!line.trim()) {
			index++;
			continue;
		}

		const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			blocks.push(`<h${level}>${parseInlineMarkdown(headingMatch[2])}</h${level}>`);
			index++;
			continue;
		}

		if (isHorizontalRule(line)) {
			blocks.push('<hr>');
			index++;
			continue;
		}

		if (line.trim().startsWith('```')) {
			index++;
			const codeLines: string[] = [];

			while (index < lines.length && !lines[index].trim().startsWith('```')) {
				codeLines.push(lines[index]);
				index++;
			}

			if (index < lines.length) index++;

			blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
			continue;
		}

		if (line.startsWith('>')) {
			const quoteLines: string[] = [];

			while (index < lines.length && lines[index].startsWith('>')) {
				quoteLines.push(lines[index].replace(/^>\s?/, ''));
				index++;
			}

			const content = quoteLines
				.map((quoteLine) => `<p>${parseInlineMarkdown(quoteLine)}</p>`)
				.join('');
			blocks.push(`<blockquote>${content}</blockquote>`);
			continue;
		}

		const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
		if (unorderedMatch) {
			const items: string[] = [];

			while (index < lines.length) {
				const itemMatch = lines[index].match(/^[-*]\s+(.+)$/);
				if (!itemMatch) break;
				items.push(`<li>${parseInlineMarkdown(itemMatch[1])}</li>`);
				index++;
			}

			blocks.push(`<ul>${items.join('')}</ul>`);
			continue;
		}

		const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
		if (orderedMatch) {
			const items: string[] = [];

			while (index < lines.length) {
				const itemMatch = lines[index].match(/^\d+\.\s+(.+)$/);
				if (!itemMatch) break;
				items.push(`<li>${parseInlineMarkdown(itemMatch[1])}</li>`);
				index++;
			}

			blocks.push(`<ol>${items.join('')}</ol>`);
			continue;
		}

		const paragraphLines = [line];
		index++;

		while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
			paragraphLines.push(lines[index]);
			index++;
		}

		blocks.push(`<p>${parseInlineMarkdown(paragraphLines.join(' '))}</p>`);
	}

	return blocks.join('');
}
