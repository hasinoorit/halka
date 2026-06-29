import { describe, it, expect } from 'vitest';
import { invertActions } from '../../lib/history/actions.js';
import { computeTextPatch, diffToActions } from '../../lib/history/diff.js';

describe('history diff engine', () => {
	it('computes text patch for insertions', () => {
		const patch = computeTextPatch('hello', 'hello world');
		expect(patch).toEqual({
			kind: 'text',
			start: 5,
			deleteCount: 0,
			insertText: ' world',
			deletedText: ''
		});
	});

	it('computes text patch for deletions', () => {
		const patch = computeTextPatch('hello world', 'hello');
		expect(patch?.deleteCount).toBe(6);
		expect(patch?.insertText).toBe('');
	});

	it('inverts forward actions to restore prior text', () => {
		const patch = computeTextPatch('abc', 'abXc');
		expect(patch?.kind).toBe('text');

		const forward = diffToActions(patch!);
		const inverse = invertActions(forward);
		expect(['replaceRange', 'deleteRange', 'insertText']).toContain(inverse[0].type);
	});
});
