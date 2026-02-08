import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';

describe('Phase 2: Virtual Formatting (No-ZWS)', () => {
	let editor: HalkaEditor;
	let root: HTMLElement;

	beforeEach(() => {
		root = document.createElement('div');
		document.body.appendChild(root);
		editor = new HalkaEditor(root);
		// Initialize with default block
		editor.setHTML('<p><br></p>');
		// Focus to ensure selection works (and set explicit range)
		root.focus();
		const range = document.createRange();
		const p = root.querySelector('p')!;
		range.setStart(p, 0);
		range.collapse(true);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	});

	afterEach(() => {
		editor.destroy();
		root.remove();
	});

	it('should maintain pending formats state', () => {
		editor.addPendingFormat('STRONG');
		expect(editor.getPendingFormats().has('STRONG')).toBe(true);

		editor.removePendingFormat('STRONG');
		expect(editor.getPendingFormats().has('STRONG')).toBe(false);
	});

	it('should use pending formats for collapsed selection toggle', () => {
		// Verify initial state
		expect(editor.getHTML()).toBe('<p><br></p>'); // Default empty state
		const range = editor.getRange();
		expect(range.collapsed).toBe(true);
		
		// Toggle bold
		editor.transforms.toggleMark('strong');
		
		// Check pending state
		expect(editor.getPendingFormats().has('STRONG')).toBe(true);
		
		// Check DOM - verify NO ZWS or empty tags inserted
		// Depending on normalization, it might be <p><br></p> or just empty. 
		// Key is that NO STRONG tag should be there yet.
		expect(root.innerHTML).not.toContain('<strong>');
		expect(root.innerHTML).not.toContain('\u200B'); // No ZWS

		// Toggle off
		editor.transforms.toggleMark('strong');
		expect(editor.getPendingFormats().has('STRONG')).toBe(false);
	});

	it('should apply pending formats when typing', () => {
		editor.transforms.toggleMark('strong');
		expect(editor.getPendingFormats().has('STRONG')).toBe(true);

		// Simulate typing 'A'
		const inputEvent = new InputEvent('beforeinput', {
			inputType: 'insertText',
			data: 'A',
			bubbles: true,
			cancelable: true
		});
		
		root.dispatchEvent(inputEvent);

		// Expect default action prevented (simulated by our code)
		// and transform called. Wrapper around 'A'.
		
		expect(root.innerHTML).toContain('<strong>A</strong>');
		
		// Pending formats should be cleared
		expect(editor.getPendingFormats().size).toBe(0);
	});

	it('should handle multiple pending formats', () => {
		editor.transforms.toggleMark('strong');
		editor.transforms.toggleMark('em');
		
		const pending = editor.getPendingFormats();
		expect(pending.has('STRONG')).toBe(true);
		expect(pending.has('EM')).toBe(true);

		// Type 'B'
		const inputEvent = new InputEvent('beforeinput', {
			inputType: 'insertText',
			data: 'B',
			bubbles: true,
			cancelable: true
		});
		root.dispatchEvent(inputEvent);

		// Check structure: nested tags
		// Order depends on set iteration but usually insertion order
		const html = root.innerHTML;
		expect(html).toContain('B');
		expect(html).toMatch(/<(strong|em)>.*<(strong|em)>B<\/\2>.*<\/\1>/);
	});

	it('should report correct active state via query', () => {
		editor.transforms.toggleMark('strong');
		// DOM has no strong tag
		expect(editor.query.findClosest('strong')).toBeNull();
		// But state (virtual) is active
		expect(editor.query.isActive('strong')).toBe(true);
	});
});
