import type { HalkaPlugin, CommandHandler } from '../core/editor.js';
import { Node as NodeHelpers, isElementNode } from '../helpers/index.js';

type TableInsertCommandPayload = {
	rows?: number;
	columns?: number;
	header?: boolean;
	footer?: boolean;
	caption?: string;
};

type TableStyleCommandPayload = {
	property: string;
	value?: string | null;
};

type TableGetStylesCommandPayload = {
	callback: (styles: Record<string, string>) => void;
};

export type TableCellActiveState = {
	tagName: 'TD' | 'TH';
	colSpan: number;
	rowSpan: number;
	isMerged: boolean;
};

export type TableActiveState = {
	cell: TableCellActiveState | null;
};

declare module '../core/editor.js' {
	interface EditorCommandMap {
		'table.insert': TableInsertCommandPayload;
		'table.addColumn': boolean;
		'table.addRow': boolean;
		'table.removeColumn': void;
		'table.removeRow': void;
		'table.styleCell': TableStyleCommandPayload;
		'table.styleRow': TableStyleCommandPayload;
		'table.styleTable': TableStyleCommandPayload;
		'table.getCellStyles': TableGetStylesCommandPayload;
		'table.getRowStyles': TableGetStylesCommandPayload;
		'table.getTableStyles': TableGetStylesCommandPayload;
		'table.mergeCells': void;
		'table.splitCell': void;
	}
	interface EditorStateMap {
		'table.active': TableActiveState | null;
	}
}

export const tablePlugin: HalkaPlugin = (editor) => {
	const root = editor.root;
	const getActiveCell = () => {
		const node = editor.getRange().commonAncestorContainer;
		if (isElementNode(node) && (node.tagName === 'TD' || node.tagName === 'TH')) {
			return node as HTMLTableCellElement;
		}
		return (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement)?.closest?.('td, th, table') as HTMLElement | null;
	};
	const getColumnIndexForCell = (cell: HTMLTableCellElement) => {
		const row = cell.parentElement as HTMLTableRowElement;
		let index = 0;
		for (const c of Array.from(row.cells)) {
			if (c === cell) return index;
			index += c.colSpan || 1;
		}
		return -1;
	};
	const getActiveRow = () => {
		const node = editor.getRange().commonAncestorContainer;
		return (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement)?.closest?.('tr') as HTMLTableRowElement | null;
	};

	type TableCellPosition = {
		row: number;
		col: number;
	};

	type SelectedCellsInfo = {
		table: HTMLTableElement;
		cells: HTMLTableCellElement[];
	};

	type TableLocation = {
		table: HTMLTableElement;
		section: HTMLTableSectionElement | null;
		row: HTMLTableRowElement;
		cell: HTMLTableCellElement;
		sectionRowIndex: number;
		columnIndex: number;
	};

	const getTableGrid = (table: HTMLTableElement): HTMLTableCellElement[][] => {
		const grid: HTMLTableCellElement[][] = [];
		Array.from(table.rows).forEach((row, r) => {
			let c = 0;
			Array.from(row.cells).forEach((cell) => {
				while (grid[r]?.[c]) c++;
				for (let rs = 0; rs < (cell.rowSpan || 1); rs++) {
					for (let cs = 0; cs < (cell.colSpan || 1); cs++) {
						if (!grid[r + rs]) grid[r + rs] = [];
						grid[r + rs][c + cs] = cell;
					}
				}
				c += cell.colSpan || 1;
			});
		});
		return grid;
	};

	const buildCellPositionMap = (
		grid: HTMLTableCellElement[][]
	): WeakMap<HTMLTableCellElement, TableCellPosition> => {
		const map = new WeakMap<HTMLTableCellElement, TableCellPosition>();

		for (let r = 0; r < grid.length; r += 1) {
			for (let c = 0; c < grid[r].length; c += 1) {
				const current = grid[r][c];
				if (current && !map.has(current)) {
					map.set(current, { row: r, col: c });
				}
			}
		}

		return map;
	};

	const getCellPosition = (
		cell: HTMLTableCellElement,
		grid: HTMLTableCellElement[][],
		positionMap: WeakMap<HTMLTableCellElement, TableCellPosition>
	): TableCellPosition => {
		const cached = positionMap.get(cell);
		if (cached) {
			return cached;
		}

		for (let r = 0; r < grid.length; r += 1) {
			for (let c = 0; c < grid[r].length; c += 1) {
				if (grid[r][c] === cell) {
					const pos = { row: r, col: c };
					positionMap.set(cell, pos);
					return pos;
				}
			}
		}

		return { row: -1, col: -1 };
	};

	const getCellFromNode = (node: Node | null) => (node?.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement)?.closest?.('td, th') as HTMLTableCellElement | null;

	const getSelectedCells = (): SelectedCellsInfo | null => {
		const range = editor.getRange();
		const node = range.commonAncestorContainer;
		const table = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement)?.closest?.('table') as HTMLTableElement | null;
		const startIdx = getCellFromNode(range.startContainer), endIdx = getCellFromNode(range.endContainer);
		if (!table || !startIdx || !endIdx) return null;
		const grid = getTableGrid(table), posMap = buildCellPositionMap(grid);
		const sPos = getCellPosition(startIdx, grid, posMap), ePos = getCellPosition(endIdx, grid, posMap);
		if (sPos.row === -1 || ePos.row === -1) return null;
		let minR = Math.min(sPos.row, ePos.row), maxR = Math.max(sPos.row, ePos.row);
		let minC = Math.min(sPos.col, ePos.col), maxC = Math.max(sPos.col, ePos.col);
		let changed = true;
		while (changed) {
			changed = false;
			for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
				const cell = grid[r]?.[c]; if (!cell) continue;
				const p = getCellPosition(cell, grid, posMap), mr = p.row + (cell.rowSpan || 1) - 1, mc = p.col + (cell.colSpan || 1) - 1;
				if (p.row < minR) { minR = p.row; changed = true; }
				if (mr > maxR) { maxR = mr; changed = true; }
				if (p.col < minC) { minC = p.col; changed = true; }
				if (mc > maxC) { maxC = mc; changed = true; }
			}
		}
		const cells: HTMLTableCellElement[] = [], seen = new Set<HTMLTableCellElement>();
		for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
			const cell = grid[r]?.[c]; if (cell && !seen.has(cell)) { cells.push(cell); seen.add(cell); }
		}
		return cells.length > 1 && new Set(cells.map(c => c.closest('thead,tbody,tfoot'))).size === 1 ? { table, cells } : null;
	};

	const getClassSelectedCells = (): SelectedCellsInfo | null => {
		const nodes = Array.from(
			root.querySelectorAll<HTMLTableCellElement>('td.halka-selected-cell, th.halka-selected-cell')
		);

		if (nodes.length < 2) {
			return null;
		}

		const first = nodes[0];
		const table = first.closest('table') as HTMLTableElement | null;

		if (!table) {
			return null;
		}

		const inSameTable = nodes.filter((cell) => cell.closest('table') === table);

		if (inSameTable.length < 2) {
			return null;
		}

		const firstSection = first.closest('thead,tbody,tfoot') as HTMLTableSectionElement | null;
		if (!firstSection) {
			return null;
		}

		const cells = inSameTable.filter((cell) => cell.closest('thead,tbody,tfoot') === firstSection);

		if (cells.length < 2) {
			return null;
		}

		return { table, cells };
	};

	const mergeCellsCore = (selected: SelectedCellsInfo): boolean => {
		const { table, cells } = selected;
		const grid = getTableGrid(table);
		const positionMap = buildCellPositionMap(grid);

		let minRow = Infinity;
		let maxRow = -Infinity;
		let minCol = Infinity;
		let maxCol = -Infinity;

		for (const cell of cells) {
			const pos = getCellPosition(cell, grid, positionMap);
			if (pos.row === -1 || pos.col === -1) {
				continue;
			}
			const rowSpan = cell.rowSpan || 1;
			const colSpan = cell.colSpan || 1;
			if (pos.row < minRow) {
				minRow = pos.row;
			}
			if (pos.row + rowSpan - 1 > maxRow) {
				maxRow = pos.row + rowSpan - 1;
			}
			if (pos.col < minCol) {
				minCol = pos.col;
			}
			if (pos.col + colSpan - 1 > maxCol) {
				maxCol = pos.col + colSpan - 1;
			}
		}

		if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) {
			return false;
		}

		const target = grid[minRow]?.[minCol];
		if (!target) {
			return false;
		}

		const processedCells = new Set<HTMLTableCellElement>();

		for (let r = minRow; r <= maxRow; r += 1) {
			for (let c = minCol; c <= maxCol; c += 1) {
				const cell = grid[r]?.[c];
				if (cell && !processedCells.has(cell)) {
					if (cell !== target) {
						NodeHelpers.copyPasteChildNodes(target, cell);
						const row = cell.parentElement;
						if (row) {
							row.removeChild(cell);
						}
					}
					processedCells.add(cell);
				}
			}
		}

		target.rowSpan = maxRow - minRow + 1;
		target.colSpan = maxCol - minCol + 1;

		editor.selection.selectAll(target);

		return true;
	};

	const mergeSelectedCells = (): boolean => {
		const selected = getSelectedCells();
		if (!selected || selected.cells.length < 2) {
			return false;
		}
		return mergeCellsCore(selected);
	};

	const getTableLocation = (): TableLocation | null => {
		const range = editor.getRange();
		const node = range.commonAncestorContainer;
		if (NodeHelpers.isInsideReadonly(node)) return null;
		const cell = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement)?.closest?.('td, th') as HTMLTableCellElement | null;
		const row = cell?.closest('tr');
		const table = row?.closest('table');
		if (!cell || !row || !table) return null;
		const section = cell.closest('thead, tbody, tfoot') as HTMLTableSectionElement | null;
		return {
			table, section, row, cell,
			sectionRowIndex: section ? Array.from(section.rows).indexOf(row) : 0,
			columnIndex: Array.from(row.cells).indexOf(cell)
		};
	};

	const applyStyle = (element: HTMLElement | null, payload?: unknown) => {
		if (!element) {
			return;
		}
		const data = (payload ?? {}) as TableStyleCommandPayload;
		if (typeof data.property !== 'string' || !data.property.trim()) {
			return;
		}
		const property = data.property.trim();
		const value = data.value;
		if (!value) {
			element.style.removeProperty(property);
			return;
		}
		element.style.setProperty(property, value);
	};

	const collectStyles = (element: HTMLElement | null): Record<string, string> => {
		const result: Record<string, string> = {};
		if (!element) {
			return result;
		}
		const style = element.style;
		for (let i = 0; i < style.length; i += 1) {
			const property = style.item(i);
			if (!property) continue;
			const value = style.getPropertyValue(property);
			if (value) {
				result[property] = value;
			}
		}
		return result;
	};

	let isSelecting = false;
	let selectionStartCell: HTMLTableCellElement | null = null;

	const clearSelection = () => {
		const nodes = root.querySelectorAll('.halka-selected-cell');
		for (const node of Array.from(nodes)) {
			node.classList.remove('halka-selected-cell');
		}
	};

	const updateSelection = (end: HTMLTableCellElement) => {
		const table = selectionStartCell?.closest('table');
		if (!selectionStartCell || !table || end.closest('table') !== table || selectionStartCell.closest('thead,tbody,tfoot') !== end.closest('thead,tbody,tfoot')) return;
		const grid = getTableGrid(table), posMap = buildCellPositionMap(grid);
		const s = getCellPosition(selectionStartCell, grid, posMap), e = getCellPosition(end, grid, posMap);
		let minR = Math.min(s.row, e.row), maxR = Math.max(s.row, e.row), minC = Math.min(s.col, e.col), maxC = Math.max(s.col, e.col), changed = true;
		while (changed) {
			changed = false;
			for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
				const cell = grid[r]?.[c]; if (!cell) continue;
				const p = getCellPosition(cell, grid, posMap), mr = p.row + (cell.rowSpan || 1) - 1, mc = p.col + (cell.colSpan || 1) - 1;
				if (p.row < minR) { minR = p.row; changed = true; }
				if (mr > maxR) { maxR = mr; changed = true; }
				if (p.col < minC) { minC = p.col; changed = true; }
				if (mc > maxC) { maxC = mc; changed = true; }
			}
		}
		clearSelection();
		const seen = new Set<HTMLTableCellElement>();
		for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
			const cell = grid[r]?.[c]; if (cell && !seen.has(cell)) { cell.classList.add('halka-selected-cell'); seen.add(cell); }
		}
	};

	const handleMouseDown = (event: MouseEvent) => {
		const target = event.target as HTMLElement | null;
		if (!target) {
			return;
		}
		const cell = target.closest('td, th') as HTMLTableCellElement | null;
		if (cell && root.contains(cell)) {
			isSelecting = true;
			selectionStartCell = cell;
			clearSelection();
			updateSelection(cell);
		} else if (root.contains(target)) {
			clearSelection();
		}
	};

	const handleMouseMove = (event: MouseEvent) => {
		if (!isSelecting || !selectionStartCell) {
			return;
		}
		const target = event.target as HTMLElement | null;
		if (!target) {
			return;
		}
		const cell = target.closest('td, th') as HTMLTableCellElement | null;
		if (cell && root.contains(cell)) {
			updateSelection(cell);
		}
	};

	const handleMouseUp = () => {
		isSelecting = false;
	};

	const injectStyles = () => {
		const doc = root.ownerDocument;
		const id = 'halka-table-styles';
		if (doc.getElementById(id)) {
			return;
		}
		const style = doc.createElement('style');
		style.id = id;
		style.textContent =
			'.halka-selected-cell{background-color:rgba(0,120,215,0.1)!important;outline:1px solid #0078d7!important;outline-offset:-1px;} [contenteditable] th:empty::before, [contenteditable] td:empty::before {content: "​";}';
		doc.head.appendChild(style);
	};

	injectStyles();

	root.addEventListener('mousedown', handleMouseDown);
	const win = root.ownerDocument.defaultView;
	if (win) {
		win.addEventListener('mousemove', handleMouseMove);
		win.addEventListener('mouseup', handleMouseUp);
	}

	const insertTable: CommandHandler<'table.insert'> = (p) => {
		let { rows = 2, columns = 2, header, footer, caption } = p ?? {};
		rows = Math.max(1, rows); columns = Math.max(1, columns);
		let html = `<table>${caption ? `<caption>${caption}</caption>` : ''}`;
		if (header) {
			html += '<thead><tr>' + Array.from({ length: columns }, (_, i) => `<th>Header ${i + 1}</th>`).join('') + '</tr></thead>';
		}
		html += `<tbody>${`<tr>${'<td></td>'.repeat(columns)}</tr>`.repeat(rows)}</tbody>`;
		if (footer) {
			html += `<tfoot><tr>${'<td></td>'.repeat(columns)}</tr></tfoot>`;
		}
		editor.insertHTML(html + '</table>');
	};
	const handleStyle = (tag: 'TD' | 'TH' | 'TR' | 'TABLE', p: unknown) => {
		const cell = getActiveCell();
		const el = tag === 'TABLE' ? cell?.closest('table') : (tag === 'TR' ? getActiveRow() : (cell?.tagName === 'TD' || cell?.tagName === 'TH' ? cell : null));
		if (el) editor.runTransaction(() => applyStyle(el as HTMLElement, p));
	};
	const styleCell: CommandHandler<'table.styleCell'> = (p) => handleStyle('TD', p);
	const styleRow: CommandHandler<'table.styleRow'> = (p) => handleStyle('TR', p);
	const styleTable: CommandHandler<'table.styleTable'> = (p) => handleStyle('TABLE', p);

	const handleGetStyles = (tag: 'TD' | 'TH' | 'TR' | 'TABLE', p: unknown) => {
		const cell = getActiveCell();
		const el = tag === 'TABLE' ? cell?.closest('table') : (tag === 'TR' ? getActiveRow() : (cell?.tagName === 'TD' || cell?.tagName === 'TH' ? cell : null));
		const callback = (p as TableGetStylesCommandPayload)?.callback;
		if (el && typeof callback === 'function') callback(collectStyles(el as HTMLElement));
	};
	const getCellStyles: CommandHandler<'table.getCellStyles'> = (p) => handleGetStyles('TD', p);
	const getRowStyles: CommandHandler<'table.getRowStyles'> = (p) => handleGetStyles('TR', p);
	const getTableStyles: CommandHandler<'table.getTableStyles'> = (p) => handleGetStyles('TABLE', p);

	const mergeCells: CommandHandler<'table.mergeCells'> = () => {
		editor.runTransaction(() => {
			const classSelected = getClassSelectedCells();
			if (classSelected) {
				mergeCellsCore(classSelected);
				clearSelection();
			} else {
				mergeSelectedCells();
			}
		});
	};

	const splitCell: CommandHandler<'table.splitCell'> = () => {
		editor.runTransaction(() => {
			const loc = getTableLocation();
			if (!loc) return;
			const { table, section, row, cell, sectionRowIndex, columnIndex } = loc;
			const targetSection = section ?? table.tBodies[0];
			if (!targetSection) return;
			const cSpan = cell.colSpan || 1, rSpan = cell.rowSpan || 1;
			if (cSpan > 1) {
				cell.colSpan = 1;
				for (let i = 1; i < cSpan; i++) {
					const newCell = editor.createEl(cell.tagName);
					row.insertBefore(newCell, cell.nextSibling);
				}
				return;
			}
			if (rSpan > 1) {
				cell.rowSpan = 1;
				const rows = Array.from(targetSection.rows);
				for (let i = 1; i < rSpan; i++) {
					const targetRow = rows[sectionRowIndex + i];
					if (!targetRow) break;
					const newCell = editor.createEl(cell.tagName);
					const rowCells = Array.from(targetRow.cells);
					columnIndex < rowCells.length ? targetRow.insertBefore(newCell, rowCells[columnIndex]) : targetRow.appendChild(newCell);
				}
			}
		});
	};

	const removeColumn: CommandHandler<'table.removeColumn'> = () => {
		const cell = getActiveCell() as HTMLTableCellElement;
		const table = cell?.closest('table');
		const targetIdx = cell ? getColumnIndexForCell(cell) : -1;
		if (!table || targetIdx < 0) return;
		editor.runTransaction(() => {
			Array.from(table.rows).forEach(row => {
				let curIdx = 0;
				for (const existing of Array.from(row.cells)) {
					const span = existing.colSpan || 1, end = curIdx + span;
					if (targetIdx >= curIdx && targetIdx < end) {
						span > 1 ? existing.colSpan-- : existing.remove();
						break;
					}
					curIdx = end;
				}
			});
		});
	};

	const removeRow: CommandHandler<'table.removeRow'> = () => {
		const row = getActiveRow();
		if (!(row && row.tagName === 'TR')) {
			return;
		}
		editor.runTransaction(() => {
			row.remove();
		});
	};

	const addColumn: CommandHandler<'table.addColumn'> = (after) => {
		const cell = getActiveCell() as HTMLTableCellElement;
		const table = cell?.closest('table');
		if (!cell || !table) return;
		const targetIdx = getColumnIndexForCell(cell);
		if (targetIdx < 0) return;
		editor.runTransaction(() => {
			const grid = getTableGrid(table);
			const posMap = buildCellPositionMap(grid);
			const insAt = after ? targetIdx + (cell.colSpan || 1) : targetIdx;
			const expanded = new Set<HTMLTableCellElement>();
			Array.from(table.rows).forEach((row, i) => {
				const logical = grid[i][insAt - (after ? 1 : 0)];
				if (logical) {
					const pos = getCellPosition(logical, grid, posMap);
					if (insAt > pos.col && insAt < pos.col + (logical.colSpan || 1)) {
						if (!expanded.has(logical)) {
							logical.colSpan++;
							expanded.add(logical);
						}
						return;
					}
				}
				const ref = Array.from(row.cells).find(c => getCellPosition(c, grid, posMap).col >= insAt);
				const newCell = editor.createEl(row.cells[0]?.tagName === 'TH' ? 'th' : 'td');
				ref ? row.insertBefore(newCell, ref) : row.appendChild(newCell);
			});
			editor.selection.setCursorAtEnd(cell);
		});
	};

	const addRow: CommandHandler<'table.addRow'> = (after) => {
		const row = getActiveRow();
		const cell = getActiveCell() as HTMLTableCellElement;
		const table = row?.closest('table');
		if (!row || !table) return;
		editor.runTransaction(() => {
			const grid = getTableGrid(table), posMap = buildCellPositionMap(grid);
			const rowIndex = Array.from(table.rows).indexOf(row);
			const maxRowSpan = Math.max(...Array.from(row.cells).map(c => c.rowSpan || 1));
			const insAt = after ? rowIndex + maxRowSpan : rowIndex;
			const expanded = new Set<HTMLTableCellElement>();
			const cols = grid[0].length, boundary = insAt;
			for (let c = 0; c < cols; c++) {
				const above = grid[boundary - 1]?.[c], at = grid[boundary]?.[c];
				if (above && at && above === at) {
					const pos = getCellPosition(above, grid, posMap);
					if (boundary > pos.row && boundary < pos.row + (above.rowSpan || 1)) {
						if (!expanded.has(above)) { above.rowSpan++; expanded.add(above); }
					}
				}
			}
			const newRow = editor.createEl('tr');
			for (let c = 0; c < cols; c++) {
				const logical = grid[boundary - (after ? 1 : 0)]?.[c];
				if (logical && expanded.has(logical)) continue;
				const tag = (grid[rowIndex][c] || table.rows[0].cells[c] || table.rows[0].cells[0])?.tagName === 'TH' ? 'th' : 'td';
				const cell = editor.createEl(tag);
				newRow.appendChild(cell);
			}
			const ref = Array.from(table.rows)[insAt];
			ref ? ref.parentElement?.insertBefore(newRow, ref) : (row.parentElement || table.tBodies[0] || table).appendChild(newRow);
			editor.selection.setCursorAtEnd(cell);
		});
	};

	const getTableActiveState = (): TableActiveState | null => {
		if (editor.query.findClosest('TABLE') === null) {
			return null;
		}

		const cell = editor.query.matchPath(
			(node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement
		);

		if (!(cell instanceof HTMLTableCellElement)) {
			return { cell: null };
		}

		const colSpan = cell.colSpan || 1;
		const rowSpan = cell.rowSpan || 1;

		return {
			cell: {
				tagName: cell.tagName as 'TD' | 'TH',
				colSpan,
				rowSpan,
				isMerged: colSpan > 1 || rowSpan > 1
			}
		};
	};

	const commands = {
		'table.insert': insertTable,
		'table.addColumn': addColumn,
		'table.addRow': addRow,
		'table.removeColumn': removeColumn,
		'table.removeRow': removeRow,
		'table.styleCell': styleCell,
		'table.styleRow': styleRow,
		'table.styleTable': styleTable,
		'table.getCellStyles': getCellStyles,
		'table.getRowStyles': getRowStyles,
		'table.getTableStyles': getTableStyles,
		'table.mergeCells': mergeCells,
		'table.splitCell': splitCell
	};

	Object.entries(commands).forEach(([name, handler]) => {
		editor.registerCommand(name as any, handler as any);
	});

	editor.registerState('table.active', getTableActiveState);

	return () => {
		editor.unregisterState('table.active', getTableActiveState);
		Object.keys(commands).forEach((name) => {
			editor.unregisterCommand(name as any, (commands as any)[name]);
		});
		root.removeEventListener('mousedown', handleMouseDown);
		win?.removeEventListener('mousemove', handleMouseMove);
		win?.removeEventListener('mouseup', handleMouseUp);
	};
};
