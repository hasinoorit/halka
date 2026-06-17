import { describe, it, expect, vi } from 'vitest';
import { HalkaEditor } from '../../lib/core/editor.js';
import { listPlugin } from '../../lib/plugins/list.js';

const createRoot = () => {
	const root = document.createElement('div');
	document.body.appendChild(root);
	return root;
};

const getParagraphText = (root: HTMLElement): Text => {
	const paragraph = root.querySelector('p');
	expect(paragraph?.firstChild?.nodeType).toBe(Node.TEXT_NODE);
	return paragraph!.firstChild as Text;
};

describe('HalkaEditor', () => {
	it('registers and executes commands', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		let called = 0;
		const handler = (payload?: unknown) => {
			if (payload === 'increment') {
				called += 1;
			}
		};

		editor.registerCommand('test.command', handler);
		editor.execCommand('test.command', 'increment');
		editor.execCommand('test.command', 'increment');

		expect(called).toBe(2);

		editor.unregisterCommand('test.command', handler);
		editor.execCommand('test.command', 'increment');

		expect(called).toBe(2);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('gets and sets HTML on the root element', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('<p>hello</p>');
		expect(editor.getHTML()).toBe('<p>hello</p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('inserts text at the current selection or at the end', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('abc');
		editor.insertText('xyz');

		expect(root.textContent).toBe('abcxyz');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('toggles bold format using inline helpers', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('hello world');
		const text = getParagraphText(root);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 5);

		editor.setSelection(range);
		editor.toggleInlineFormat('bold');

		expect(root.innerHTML).toContain('<strong>hello</strong>');

		editor.toggleInlineFormat('bold');

		expect(root.textContent).toBe('hello world');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('removes outer format but preserves nested inner format', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('hello world');
		const text = getParagraphText(root);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 5);

		editor.setSelection(range);
		editor.toggleInlineFormat('bold');
		editor.toggleInlineFormat('italic');

		expect(root.innerHTML).toContain('<strong><em>hello</em></strong>');

		editor.toggleInlineFormat('bold');

		expect(root.innerHTML).toContain('<em>hello</em>');
		expect(root.innerHTML).not.toContain('<strong>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('emits change events when content changes', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		const handler = vi.fn();
		editor.on('change', handler);

		editor.setHTML('<p>changed</p>');

		expect(handler).toHaveBeenCalled();

		document.body.removeChild(root);
		editor.destroy();
	});

	it('runs DOM operations in a transaction and only emits on change', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		const handler = vi.fn();
		editor.on('change', handler);

		editor.runTransaction((ed) => {
			(ed as HalkaEditor).root.innerHTML = '<p>tx</p>';
		});

		expect(editor.getHTML()).toBe('<p>tx</p>');
		expect(handler).toHaveBeenCalledTimes(1);

		handler.mockClear();

		editor.runTransaction(() => { });

		expect(handler).not.toHaveBeenCalled();

		document.body.removeChild(root);
		editor.destroy();
	});

	it('updates existing span style instead of wrapping again', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		const span = document.createElement('span');
		span.style.setProperty('color', 'red');
		const text = document.createTextNode('hello');
		span.appendChild(text);
		root.appendChild(span);

		const range = document.createRange();
		range.selectNodeContents(span);
		editor.setSelection(range);

		editor.setInlineStyle('color', 'blue');

		const spans = root.querySelectorAll('span');
		expect(spans.length).toBe(1);
		expect(spans[0].style.getPropertyValue('color')).toBe('blue');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('clears style and unwraps empty span when value is omitted', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('hello');
		const text = getParagraphText(root);

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		editor.setSelection(range);

		editor.setInlineStyle('color', 'red');

		const span = root.querySelector('span') as HTMLSpanElement | null;
		expect(span).not.toBeNull();

		editor.setInlineStyle('color');

		expect(root.querySelector('span')).toBeNull();
		expect(root.textContent).toBe('hello');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('applies block format as direct child and preserves styles', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('<p style="text-align: center;">hello</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		editor.setSelection(range);

		editor.toggleBlockFormat('h1');

		const block = root.firstElementChild as HTMLElement;
		expect(block.tagName).toBe('H1');
		expect(block.style.textAlign).toBe('center');
		expect(block.textContent).toBe('hello');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('toggles block format back to paragraph preserving styles', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('<h1 style="text-align: right;">hello</h1>');

		const h1 = root.firstElementChild as HTMLElement;
		const text = h1.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		editor.setSelection(range);

		editor.toggleBlockFormat('h1');

		const block = root.firstElementChild as HTMLElement;
		expect(block.tagName).toBe('P');
		expect(block.style.textAlign).toBe('right');
		expect(block.textContent).toBe('hello');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('preserves selection when applying block format', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('<p>hello world</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 5);
		editor.setSelection(range);

		editor.toggleBlockFormat('h1');

		const selection = window.getSelection();
		expect(selection && selection.rangeCount > 0).toBeTruthy();

		const newRange = selection?.getRangeAt(0);
		expect(newRange?.startOffset).toBe(0);
		expect(newRange?.endOffset).toBe(5);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('invokes shortcut listeners for matching key combinations', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: true });

		const handler = vi.fn();
		editor.onShortcut('mod+b', handler);

		const event = new KeyboardEvent('keydown', {
			key: 'b',
			ctrlKey: true,
			bubbles: true
		});

		root.dispatchEvent(event);

		expect(handler).toHaveBeenCalled();

		document.body.removeChild(root);
		editor.destroy();
	});

	it('list plugin toggles unordered list with shortcut', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: true, plugins: [listPlugin] });

		editor.setHTML('<p>item</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, text.textContent?.length ?? 0);
		editor.setSelection(range);

		const event = new KeyboardEvent('keydown', {
			key: '8',
			ctrlKey: true,
			shiftKey: true,
			bubbles: true
		});

		root.dispatchEvent(event);

		const ul = root.querySelector('ul');
		expect(ul).not.toBeNull();
		const li = ul?.querySelector('li');
		expect(li?.textContent).toBe('item');

		root.dispatchEvent(event);

		const ulAfter = root.querySelector('ul');
		expect(ulAfter).toBeNull();
		const block = root.firstElementChild as HTMLElement;
		expect(block.tagName).toBe('P');
		expect(block.textContent).toBe('item');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('registers and retrieves state', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		const handler = () => 'test-value';
		editor.registerState('test.state' as any, handler as any);

		expect(editor.getState('test.state' as any)).toBe('test-value');

		editor.unregisterState('test.state' as any, handler as any);
		expect(editor.getState('test.state' as any)).toBeUndefined();

		document.body.removeChild(root);
		editor.destroy();
	});

	it('supports state with payloads', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		const handler = (payload?: any) => `received: ${payload?.msg}`;
		editor.registerState('test.payload' as any, handler as any);

		expect(editor.getState('test.payload' as any, { msg: 'hello' } as any)).toBe('received: hello');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('tracks active formats and styles on selection change', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });

		editor.setHTML('<p><strong>bold</strong> text</p>');
		const strong = root.querySelector('strong')!;
		const text = strong.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 4);
		editor.setSelection(range);

		// Trigger manual update as selectionchange might be slow in JSDOM
		(editor as any).updateActiveFormatsAndStyles();

		expect(editor.hasFormat('bold')).toBe(true);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('Should track selection format state correctly', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });
		editor.setHTML('<p>Hello <strong>World</strong></p>');
		const b = editor.root.querySelector('strong');
		const range = document.createRange();
		range.selectNodeContents(b!);
		window.getSelection()?.removeAllRanges();
		window.getSelection()?.addRange(range);

		// Trigger selection change to update internal state
		document.dispatchEvent(new Event('selectionchange'));

		expect(editor.hasFormat('bold')).toBe(true);
		expect(editor.hasFormat('italic')).toBe(false);

		document.body.removeChild(root);
		editor.destroy();
	});



	it('list plugin preserves selection when toggling unordered list', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: true, plugins: [listPlugin] });

		editor.setHTML('<p>hello world</p>');

		const p = root.firstElementChild as HTMLElement;
		const text = p.firstChild as Text;

		const range = document.createRange();
		range.setStart(text, 5);
		range.setEnd(text, 5);
		editor.setSelection(range);

		const event = new KeyboardEvent('keydown', {
			key: '8',
			ctrlKey: true,
			shiftKey: true,
			bubbles: true
		});

		root.dispatchEvent(event);

		const selectionAfterFirstToggle = window.getSelection();
		expect(selectionAfterFirstToggle && selectionAfterFirstToggle.rangeCount > 0).toBeTruthy();
		const rangeAfterFirstToggle = selectionAfterFirstToggle?.getRangeAt(0);

		const ul = root.querySelector('ul');
		const li = ul?.querySelector('li');
		const liText = li?.firstChild as Text;

		expect(rangeAfterFirstToggle?.collapsed).toBe(true);
		expect(rangeAfterFirstToggle?.startContainer).toBe(liText);
		expect(rangeAfterFirstToggle?.startOffset).toBe(5);

		root.dispatchEvent(event);

		const selectionAfterSecondToggle = window.getSelection();
		expect(selectionAfterSecondToggle && selectionAfterSecondToggle.rangeCount > 0).toBeTruthy();
		const rangeAfterSecondToggle = selectionAfterSecondToggle?.getRangeAt(0);

		const pAfter = root.firstElementChild as HTMLElement;
		const textAfter = pAfter.firstChild as Text;

		expect(rangeAfterSecondToggle?.collapsed).toBe(true);
		expect(rangeAfterSecondToggle?.startContainer).toBe(textAfter);
		expect(rangeAfterSecondToggle?.startOffset).toBe(5);

		document.body.removeChild(root);
		editor.destroy();
	});

	it('toggles bold multiple times correctly without nesting', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });
		editor.setHTML('<p>hello world</p>');

		// Select "hello"
		const p = root.firstChild as HTMLElement;
		const text = p.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 0);
		range.setEnd(text, 5);
		editor.setSelection(range);

		// First toggle: bold
		editor.toggleInlineFormat('bold');
		expect(editor.getHTML()).toBe('<p><strong>hello</strong> world</p>');

		// Second toggle: should unbold
		editor.toggleInlineFormat('bold');
		expect(editor.getHTML()).toBe('<p>hello world</p>');

		// Third toggle: should bold again
		editor.toggleInlineFormat('bold');
		expect(editor.getHTML()).toBe('<p><strong>hello</strong> world</p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('toggles bold on partial selection inside bold', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });
		editor.setHTML('<p><strong>hello</strong> world</p>');

		// Select "ell" inside "hello"
		const strong = root.querySelector('strong') as HTMLElement;
		const text = strong.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 1);
		range.setEnd(text, 4);
		editor.setSelection(range);

		// Toggle bold: should unbold "ell", resulting in "h" + "ell" + "o" where "ell" is not bold
		// Wait, most editors would split the strong tag.
		editor.toggleInlineFormat('bold');

		// Expected: <strong>h</strong>ell<strong>o</strong> world
		expect(editor.getHTML()).toBe('<p><strong>h</strong>ell<strong>o</strong> world</p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('avoids nested strong tags when partially overlapping', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });
		editor.setHTML('<p><strong>hello</strong> world</p>');

		// Select "lo wor"
		// hello -> <strong> + text node "hello"
		// " world" -> text node " world"
		const strong = root.querySelector('strong') as HTMLElement;
		const text1 = strong.firstChild as Text;
		const text2 = root.querySelector('p')?.childNodes[1] as Text;

		const range = document.createRange();
		range.setStart(text1, 3); // "lo"
		range.setEnd(text2, 4);   // " wor"
		editor.setSelection(range);

		// Toggle bold
		editor.toggleInlineFormat('bold');

		// Expected: <strong>hello wor</strong>ld (or similar flattened structure)
		// NOT: <strong>hel</strong><strong><strong>lo</strong> wor</strong>ld
		const html = editor.getHTML();
		expect(html).not.toContain('<strong><strong>');
		expect(html).toContain('<strong>hello wor</strong>');

		document.body.removeChild(root);
		editor.destroy();
	});

	it('toggles bold on a middle word correctly', () => {
		const root = createRoot();
		const editor = new HalkaEditor(root, { shortcuts: false });
		editor.setHTML('<p>hello middle world</p>');

		// Select "middle"
		const p = root.firstChild as HTMLElement;
		const text = p.firstChild as Text;
		const range = document.createRange();
		range.setStart(text, 6); // After "hello "
		range.setEnd(text, 12);  // After "middle"
		editor.setSelection(range);

		// First toggle: bold
		editor.toggleInlineFormat('bold');
		expect(editor.getHTML()).toBe('<p>hello <strong>middle</strong> world</p>');

		// Second toggle: should unbold
		editor.toggleInlineFormat('bold');
		expect(editor.getHTML()).toBe('<p>hello middle world</p>');

		document.body.removeChild(root);
		editor.destroy();
	});

	describe('block mode normalization', () => {
		it('wraps loose text in a paragraph', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false });

			editor.setHTML('abc');

			expect(editor.getHTML()).toBe('<p>abc</p>');
			expect(
				Array.from(root.childNodes).some((node) => node.nodeType === Node.TEXT_NODE)
			).toBe(false);

			document.body.removeChild(root);
			editor.destroy();
		});

		it('splits multiline text into paragraphs', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false });

			editor.setHTML('a\nb');

			expect(editor.getHTML()).toBe('<p>a</p><p>b</p>');

			document.body.removeChild(root);
			editor.destroy();
		});

		it('inserts multiline text as separate paragraphs', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false });

			editor.setHTML('<p><br></p>');
			editor.insertText('line one\nline two');

			expect(editor.getHTML()).toBe('<p>line one</p><p>line two</p>');

			document.body.removeChild(root);
			editor.destroy();
		});

		it('normalizes browser input that places text directly in root', () => {
			const root = createRoot();
			root.appendChild(document.createTextNode('Hello'));
			const editor = new HalkaEditor(root, { shortcuts: false });

			expect(editor.getHTML()).toBe('<p>Hello</p>');

			document.body.removeChild(root);
			editor.destroy();
		});
	});

	describe('inline mode', () => {
		it('flattens block HTML to inline content', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false, inline: true });

			editor.setHTML('<p>hello</p>');

			expect(editor.getHTML()).toBe('hello');
			expect(root.querySelector('p')).toBeNull();

			document.body.removeChild(root);
			editor.destroy();
		});

		it('strips newlines from content', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false, inline: true });

			editor.setHTML('hello\nworld');

			expect(editor.getHTML()).toBe('hello world');

			document.body.removeChild(root);
			editor.destroy();
		});

		it('keeps empty editor without block placeholder', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false, inline: true });

			editor.setHTML('');

			expect(editor.getHTML()).toBe('');

			document.body.removeChild(root);
			editor.destroy();
		});
	});

	describe('selection persistence', () => {
		it('uses offsets when native range is stale', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false });

			editor.setHTML('<p>hello world</p>');
			editor.setSelectionOffsets({ start: 6, end: 6 });
			editor.applySelection(true);

			expect(editor.getSelectionOffsets()).toEqual({ start: 6, end: 6 });

			document.body.removeChild(root);
			editor.destroy();
		});

		it('preserves selection offset after block format toggle', () => {
			const root = createRoot();
			const editor = new HalkaEditor(root, { shortcuts: false });

			editor.setHTML('<p>hello world</p>');
			const text = getParagraphText(root);

			const range = document.createRange();
			range.setStart(text, 6);
			range.setEnd(text, 6);
			editor.setSelection(range);

			const before = editor.getSelectionOffsets();
			editor.toggleBlockFormat('h1');
			const after = editor.getSelectionOffsets();

			expect(after).toEqual(before);

			document.body.removeChild(root);
			editor.destroy();
		});
	});
});
