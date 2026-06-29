const MSO_NORMAL_CLASS = /MsoNormal/i;

const unwrapElement = (el: Element): void => {
	const parent = el.parentNode;
	if (!parent) return;

	while (el.firstChild) {
		parent.insertBefore(el.firstChild, el);
	}
	parent.removeChild(el);
};

const normalizeWordBold = (doc: Document): void => {
	doc.querySelectorAll('b, strong').forEach((el) => {
		const style = el.getAttribute('style') ?? '';
		if (/font-weight\s*:\s*normal/i.test(style)) {
			unwrapElement(el);
		}
	});
};

const normalizeMsoParagraphs = (doc: Document): void => {
	doc.querySelectorAll('[class]').forEach((el) => {
		const className = el.getAttribute('class') ?? '';
		if (!MSO_NORMAL_CLASS.test(className) || el.tagName === 'P') return;

		const paragraph = doc.createElement('p');
		while (el.firstChild) {
			paragraph.appendChild(el.firstChild);
		}
		el.replaceWith(paragraph);
	});
};

const removeEmptyOfficeElements = (doc: Document): void => {
	doc.querySelectorAll('*').forEach((el) => {
		const tag = el.tagName.toLowerCase();
		if (tag === 'o:p' && !el.textContent?.trim()) {
			el.remove();
		}
	});
};

/**
 * Quill table modules often emit one <tr> per column with data-row grouping
 * instead of a single row with multiple <td> cells.
 */
const normalizeQuillTables = (doc: Document): void => {
	for (const table of doc.querySelectorAll('table')) {
		for (const tbody of table.querySelectorAll('tbody')) {
			const rows = Array.from(tbody.children).filter(
				(node): node is HTMLTableRowElement => node.nodeName === 'TR'
			);
			if (rows.length < 2) continue;

			const isQuillSingleCellRows = rows.every((tr) => {
				const cells = Array.from(tr.children).filter(
					(cell) => cell.nodeName === 'TD' || cell.nodeName === 'TH'
				);
				return cells.length === 1 && (cells[0] as HTMLElement).hasAttribute('data-row');
			});

			if (!isQuillSingleCellRows) continue;

			const groups: HTMLTableCellElement[][] = [];
			let current: HTMLTableCellElement[] = [];
			let lastKey: string | null = null;

			for (const tr of rows) {
				const cell = tr.children[0] as HTMLTableCellElement;
				const key = cell.getAttribute('data-row') ?? '';

				if (lastKey !== null && key !== lastKey && current.length > 0) {
					groups.push(current);
					current = [];
				}

				lastKey = key;
				current.push(cell);
			}

			if (current.length > 0) {
				groups.push(current);
			}

			for (const tr of rows) {
				tr.remove();
			}

			for (const cells of groups) {
				const tr = doc.createElement('tr');
				for (const cell of cells) {
					cell.removeAttribute('data-row');
					tr.appendChild(cell);
				}
				tbody.appendChild(tr);
			}
		}
	}
};

/**
 * Headings should not wrap block images — extract to a preceding paragraph.
 */
const extractImagesFromHeadings = (doc: Document): void => {
	for (const heading of doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
		const images = Array.from(heading.querySelectorAll('img'));
		if (images.length === 0) continue;

		for (const img of images) {
			const paragraph = doc.createElement('p');
			paragraph.appendChild(img);
			heading.parentNode?.insertBefore(paragraph, heading);
		}

		// Remove empty formatting wrappers left behind
		heading.querySelectorAll('strong, b, em, i, span').forEach((el) => {
			if (!el.textContent?.trim() && !el.querySelector('img, br, hr')) {
				el.remove();
			}
		});
	}
};

export const normalizeExternalHTML = (doc: Document): void => {
	removeEmptyOfficeElements(doc);
	normalizeWordBold(doc);
	normalizeMsoParagraphs(doc);
	normalizeQuillTables(doc);
	extractImagesFromHeadings(doc);
};
