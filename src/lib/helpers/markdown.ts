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

const isRemoteImageUrl = (url: string): boolean => {
	const trimmed = url.trim();
	return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//');
};

export function parseInlineMarkdown(text: string): string {
	let result = escapeHtml(text);

	result = result.replace(
		/!\[([^\]]*)\]\(([^)]+)\)/g,
		(_match, alt: string, src: string) => {
			if (!isRemoteImageUrl(src)) return escapeHtml(_match);
			const safeAlt = escapeHtml(alt);
			const safeSrc = sanitizeHref(src);
			return `<img src="${safeSrc}" alt="${safeAlt}">`;
		}
	);

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

function getListIndent(line: string): number {
	const unorderedMatch = line.match(/^(\s*)[-*]\s+/);
	if (unorderedMatch) return unorderedMatch[1].replace(/\t/g, '    ').length;
	const orderedMatch = line.match(/^(\s*)\d+\.\s+/);
	if (orderedMatch) return orderedMatch[1].replace(/\t/g, '    ').length;
	return -1;
}

function isTableRow(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|', 1);
}

function isTableSeparator(line: string): boolean {
	const trimmed = line.trim();
	if (!isTableRow(trimmed)) return false;
	const cells = trimmed
		.slice(1, -1)
		.split('|')
		.map((cell) => cell.trim());
	return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableRow(line: string): string[] {
	return line
		.trim()
		.slice(1, -1)
		.split('|')
		.map((cell) => cell.trim());
}

function parseMarkdownTable(lines: string[], startIndex: number): { html: string; nextIndex: number } | null {
	if (!isTableRow(lines[startIndex])) return null;
	if (startIndex + 1 >= lines.length || !isTableSeparator(lines[startIndex + 1])) return null;

	const headerCells = parseTableRow(lines[startIndex]);
	let index = startIndex + 2;
	const bodyRows: string[][] = [];

	while (index < lines.length && isTableRow(lines[index]) && !isTableSeparator(lines[index])) {
		bodyRows.push(parseTableRow(lines[index]));
		index++;
	}

	const headerHtml = headerCells.map((cell) => `<th>${parseInlineMarkdown(cell)}</th>`).join('');
	const bodyHtml = bodyRows
		.map((row) => `<tr>${row.map((cell) => `<td>${parseInlineMarkdown(cell)}</td>`).join('')}</tr>`)
		.join('');

	return {
		html: `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`,
		nextIndex: index
	};
}

type ParsedListItem = {
	indent: number;
	ordered: boolean;
	content: string;
};

type ListTreeNode = ParsedListItem & {
	children: ListTreeNode[];
};

function parseListItems(lines: string[], startIndex: number): { items: ParsedListItem[]; nextIndex: number } {
	const items: ParsedListItem[] = [];
	let index = startIndex;

	while (index < lines.length) {
		const line = lines[index];
		const indent = getListIndent(line);
		if (indent < 0) break;

		const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
		const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
		const match = unorderedMatch ?? orderedMatch;
		if (!match) break;

		items.push({
			indent,
			ordered: Boolean(orderedMatch),
			content: match[2]
		});
		index++;
	}

	return { items, nextIndex: index };
}

function buildListTree(items: ParsedListItem[]): ListTreeNode[] {
	const roots: ListTreeNode[] = [];
	const stack: ListTreeNode[] = [];

	for (const item of items) {
		const node: ListTreeNode = { ...item, children: [] };

		while (stack.length > 0 && stack[stack.length - 1].indent >= item.indent) {
			stack.pop();
		}

		if (stack.length === 0) {
			roots.push(node);
		} else {
			stack[stack.length - 1].children.push(node);
		}

		stack.push(node);
	}

	return roots;
}

function renderListTree(nodes: ListTreeNode[]): string {
	if (nodes.length === 0) return '';

	const groups: { ordered: boolean; nodes: ListTreeNode[] }[] = [];
	for (const node of nodes) {
		const last = groups[groups.length - 1];
		if (last && last.ordered === node.ordered) {
			last.nodes.push(node);
		} else {
			groups.push({ ordered: node.ordered, nodes: [node] });
		}
	}

	return groups
		.map((group) => {
			const tag = group.ordered ? 'ol' : 'ul';
			const items = group.nodes
				.map(
					(node) =>
						`<li>${parseInlineMarkdown(node.content)}${renderListTree(node.children)}</li>`
				)
				.join('');
			return `<${tag}>${items}</${tag}>`;
		})
		.join('');
}

function isBlockStart(line: string): boolean {
	if (!line.trim()) return false;

	return (
		isHorizontalRule(line) ||
		/^#{1,6}\s/.test(line) ||
		line.startsWith('>') ||
		getListIndent(line) >= 0 ||
		line.trim().startsWith('```') ||
		isTableRow(line)
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

		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
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

		const table = parseMarkdownTable(lines, index);
		if (table) {
			blocks.push(table.html);
			index = table.nextIndex;
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

		if (getListIndent(line) >= 0) {
			const parsed = parseListItems(lines, index);
			blocks.push(renderListTree(buildListTree(parsed.items)));
			index = parsed.nextIndex;
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
