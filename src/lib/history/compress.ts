import type { HistoryStep, StackEntry } from './types.js';

export function maybeCompressPayload<T>(value: T, threshold: number, enabled: boolean): T | string {
	if (!enabled || typeof value !== 'string' || value.length < threshold) {
		return value;
	}
	return compressString(value);
}

export function maybeDecompressPayload<T>(value: T | string): T {
	if (typeof value !== 'string' || !value.startsWith('lz:')) {
		return value as T;
	}
	return decompressString(value.slice(3)) as T;
}

function compressString(input: string): string {
	const encoded = btoa(unescape(encodeURIComponent(input)));
	return `lz:${encoded}`;
}

function decompressString(input: string): string {
	return decodeURIComponent(escape(atob(input)));
}

export function compressStep(step: HistoryStep, threshold: number, enabled: boolean): HistoryStep {
	if (!enabled) return step;
	const next = { ...step };
	if (next.diff && next.diff.kind === 'html-insert' && next.diff.html.length >= threshold) {
		next.diff = { ...next.diff, html: maybeCompressPayload(next.diff.html, threshold, true) as string };
	}
	if (next.diff && next.diff.kind === 'html-replace') {
		if (next.diff.html.length >= threshold) {
			next.diff = { ...next.diff, html: maybeCompressPayload(next.diff.html, threshold, true) as string };
		}
		if (next.diff.previousHtml.length >= threshold) {
			next.diff = {
				...next.diff,
				previousHtml: maybeCompressPayload(next.diff.previousHtml, threshold, true) as string
			};
		}
	}
	return next;
}

export function decompressStep(step: HistoryStep): HistoryStep {
	const next = { ...step };
	if (next.diff?.kind === 'html-insert') {
		next.diff = { ...next.diff, html: maybeDecompressPayload(next.diff.html) };
	}
	if (next.diff?.kind === 'html-replace') {
		next.diff = {
			...next.diff,
			html: maybeDecompressPayload(next.diff.html),
			previousHtml: maybeDecompressPayload(next.diff.previousHtml)
		};
	}
	return next;
}

const STORAGE_KEY = 'halka-history';

export function persistStack(undoStack: StackEntry[], redoStack: StackEntry[]): void {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ undoStack, redoStack }));
	} catch {
		// ignore quota errors
	}
}

export function restoreStack(): { undoStack: StackEntry[]; redoStack: StackEntry[] } | null {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as { undoStack: StackEntry[]; redoStack: StackEntry[] };
	} catch {
		return null;
	}
}

export function clearPersistedStack(): void {
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}
