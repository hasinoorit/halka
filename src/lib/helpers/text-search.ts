import { isElementNode } from './node.js';

export type TextMatch = {
	start: number;
	end: number;
};

export type FindOptions = {
	caseSensitive?: boolean;
	wholeWord?: boolean;
};

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function collectEditableText(root: HTMLElement): string {
	const doc = root.ownerDocument;
	const filter = {
		acceptNode(node: Node) {
			if ((node as Text).data.length === 0) return NodeFilter.FILTER_REJECT;

			let parent: Node | null = node.parentNode;
			while (parent && parent !== root) {
				if (
					isElementNode(parent) &&
					(parent as HTMLElement).getAttribute('contenteditable') === 'false'
				) {
					return NodeFilter.FILTER_REJECT;
				}
				parent = parent.parentNode;
			}

			return NodeFilter.FILTER_ACCEPT;
		}
	};

	const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, filter);
	const parts: string[] = [];

	while (walker.nextNode()) {
		parts.push((walker.currentNode as Text).data);
	}

	return parts.join('');
}

export function findTextMatches(
	text: string,
	query: string,
	options: FindOptions = {}
): TextMatch[] {
	if (!query) return [];

	const flags = options.caseSensitive ? 'g' : 'gi';
	let pattern = escapeRegExp(query);
	if (options.wholeWord) {
		pattern = `\\b${pattern}\\b`;
	}

	const regex = new RegExp(pattern, flags);
	const matches: TextMatch[] = [];

	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		matches.push({
			start: match.index,
			end: match.index + match[0].length
		});

		if (match[0].length === 0) {
			regex.lastIndex += 1;
		}
	}

	return matches;
}

export function findMatchIndexAtOrAfter(
	matches: TextMatch[],
	offset: number,
	preferCurrent = true
): number {
	if (matches.length === 0) return -1;

	if (preferCurrent) {
		const current = matches.findIndex((match) => match.start <= offset && offset < match.end);
		if (current !== -1) return current;
	}

	for (let index = 0; index < matches.length; index++) {
		if (matches[index].start >= offset) return index;
	}

	return 0;
}

export function findNextMatchIndex(matches: TextMatch[], currentIndex: number): number {
	if (matches.length === 0) return -1;
	if (currentIndex < 0) return 0;
	return (currentIndex + 1) % matches.length;
}

export function findPreviousMatchIndex(matches: TextMatch[], currentIndex: number): number {
	if (matches.length === 0) return -1;
	if (currentIndex < 0) return matches.length - 1;
	return (currentIndex - 1 + matches.length) % matches.length;
}
