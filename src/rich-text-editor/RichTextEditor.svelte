<script lang="ts">
	import './styles.css';
	import { onMount, onDestroy } from 'svelte';
	import { HalkaEditor } from 'halka';
	import { historyPlugin } from 'halka/plugins/history';
	import { pastePlugin } from 'halka/plugins/paste';
	import { placeholderPlugin } from 'halka/plugins/placeholder';
	import { linkPlugin } from 'halka/plugins/link';
	import { listPlugin } from 'halka/plugins/list';
	import { imagePlugin } from 'halka/plugins/image';
	import { tablePlugin } from 'halka/plugins/table';
	import { footnotePlugin } from 'halka/plugins/footnote';
	import { markdownShortcutsPlugin } from 'halka/plugins/markdown-shortcuts';
	import { findReplacePlugin } from 'halka/plugins/find-replace';
	import Button from './ui/button.svelte';
	import Card from './ui/card.svelte';
	import CardContent from './ui/card-content.svelte';
	import Dialog from './ui/dialog.svelte';
	import FindReplace from './FindReplace.svelte';
	import FootnoteManager from './FootnoteManager.svelte';
	import Toolbar from './Toolbar.svelte';
	import TableFloatingToolbar from './TableFloatingToolbar.svelte';
	import type { TableActiveState } from 'halka/plugins/table';
	import { colorStore } from '../components/color-picker/index.js';

	interface Props {
		content?: string;
		class?: string;
		placeholder?: string;
		onChange?: (html: string) => void;
		onImageUpload?: (file: File | Blob) => Promise<string>;
	}

	let {
		content = $bindable(''),
		class: className = '',
		placeholder,
		onChange = (html: string) => {},
		onImageUpload
	}: Props = $props();

	let editorElement = $state<HTMLElement>();
	let editor = $state<HalkaEditor>();

	let activeBlock = $state<string | null>(null);
	let activeList = $state<'ul' | 'ol' | null>(null);
	let tableActive = $state<TableActiveState | null>(null);

	// Formatting States
	let bold = $state(false);
	let italic = $state(false);
	let underline = $state(false);
	let strike = $state(false);
	let code = $state(false);
	let sub = $state(false);
	let sup = $state(false);

	let link = $state(false);
	let imageSelected = $state(false);

	// Style States
	let color = $state('#000000');
	let backgroundColor = $state('#ffffff');
	let fontSize = $state('16px');
	let fontFamily = $state('ui-sans-serif');
	let textAlign = $state('left');
	let canUndo = $state(false);
	let canRedo = $state(false);

	// Modal states
	let showLinkModal = $state(false);
	let linkUrl = $state('');
	let showImageModal = $state(false);
	let imageUrl = $state('');
	let imageAlt = $state('');
	let imageLayout = $state<'inline' | 'block'>('inline');
	let imageWidth = $state('');
	let imageHeight = $state('');
	let imageMaxWidth = $state('');
	let imageEditing = $state(false);
	let showTableModal = $state(false);
	let tableRows = $state(3);
	let tableCols = $state(3);
	let tableHeader = $state(true);
	let showFootnoteModal = $state(false);
	let showFindReplace = $state(false);

	function rgbToHex(input: string): string | null {
		const s = input.trim().toLowerCase();
		if (s.startsWith('#')) return s;

		// Match rgb or rgba
		const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
		if (!m) return null;

		const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
		const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
		const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));

		return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
	}

	function normalizeEditorColor(input: string | undefined, fallback: string): string {
		if (!input) return fallback;
		const value = input.trim();
		if (value.startsWith('var(--colors-')) return value;
		return rgbToHex(value) || fallback;
	}

	function refresh() {
		if (!editor) return;
		bold = editor.query.isActive('STRONG') || editor.query.isActive('B');
		italic = editor.query.isActive('EM') || editor.query.isActive('I');
		underline = editor.query.isActive('U');
		strike =
			editor.query.isActive('S') || editor.query.isActive('STRIKE') || editor.query.isActive('DEL');
		code = editor.query.isActive('CODE');
		sub = editor.query.isActive('SUB');
		sup = editor.query.isActive('SUP');
		link = editor.query.isActive('A');

		imageSelected = editor.getState('image.active') !== null;

		tableActive = editor.getState('table.active') ?? null;

		activeList = editor.getState('list.active')?.type ?? null;

		const block = editor.query.getCurrentBlock();
		if (block instanceof HTMLElement) {
			activeBlock = block.tagName === 'LI' ? 'p' : block.tagName.toLowerCase();
		} else {
			activeBlock = null;
		}
		color = normalizeEditorColor(editor.getStyle('color'), '#000000');
		backgroundColor = normalizeEditorColor(editor.getStyle('background-color'), '#ffffff');
		fontSize = editor.getStyle('font-size') || '16px';
		fontFamily = (editor.getStyle('font-family') || 'ui-sans-serif').replace(/['"]/g, '');
		textAlign = editor.getStyle('text-align') || 'left';
		canUndo = editor.getState('history.canUndo') === true;
		canRedo = editor.getState('history.canRedo') === true;
	}

	onMount(() => {
		if (editorElement) {
			editor = new HalkaEditor(editorElement, {
				plugins: [
					historyPlugin,
					pastePlugin(onImageUpload ? { onImageUpload } : {}),
					linkPlugin,
					listPlugin,
					imagePlugin,
					tablePlugin,
					footnotePlugin,
					findReplacePlugin,
					markdownShortcutsPlugin,
					...(placeholder ? [placeholderPlugin(placeholder)] : [])
				]
			});
			editor.setHTML(content);
			editor.on('change', (data: any) => {
				const html = typeof data === 'string' ? data : data?.html ?? '';
				onChange?.(html);
				if (content !== html) {
					content = html;
				}
			});
			editor.on('formatChange', refresh);
			refresh();
			colorStore.registerDocument(editor.root.ownerDocument);
		}
	});

	$effect(() => {
		if (editor && editorElement && document.activeElement !== editorElement) {
			const current = editor.getHTML();
			if (content !== current) {
				editor.setHTML(content);
			}
		}
	});

	onDestroy(() => {
		if (editor) {
			colorStore.unregisterDocument(editor.root.ownerDocument);
			editor.destroy();
		}
	});

	// --- Actions ---

	function insertLink() {
		if (!editor) return;
		if (link) {
			const activeLink = editor.getState('link.active') as { href?: string } | null;
			linkUrl = activeLink?.href || '';
		} else {
			linkUrl = '';
		}
		showLinkModal = true;
	}

	function resetImageForm() {
		imageUrl = '';
		imageAlt = '';
		imageLayout = 'inline';
		imageWidth = '';
		imageHeight = '';
		imageMaxWidth = '';
		imageEditing = false;
	}

	function imageStylePayload() {
		return {
			width: imageWidth,
			height: imageHeight,
			maxWidth: imageMaxWidth
		};
	}

	function insertImage() {
		if (!editor) return;
		const active = editor.getState('image.active') as {
			src?: string;
			alt?: string;
			layout?: 'inline' | 'block';
			style?: {
				width?: string;
				height?: string;
				maxWidth?: string;
			};
		} | null;
		if (active) {
			imageUrl = active.src || '';
			imageAlt = active.alt || '';
			imageLayout = active.layout || 'inline';
			imageWidth = active.style?.width || '';
			imageHeight = active.style?.height || '';
			imageMaxWidth = active.style?.maxWidth || '';
			imageEditing = true;
		} else {
			resetImageForm();
		}
		showImageModal = true;
	}

	function insertTable() {
		if (!editor) return;
		showTableModal = true;
	}

	function handleLinkSubmit() {
		if (editor) {
			editor.execCommand('link.toggle', { href: linkUrl });
			linkUrl = '';
			showLinkModal = false;
		}
	}

	function handleImageSubmit() {
		if (imageUrl && editor) {
			const payload = {
				src: imageUrl,
				alt: imageAlt,
				layout: imageLayout,
				style: imageStylePayload()
			};
			if (imageEditing) {
				editor.execCommand('image.update', payload);
			} else {
				editor.execCommand('image.insert', payload);
			}
			resetImageForm();
			showImageModal = false;
		}
	}

	function handleTableSubmit() {
		if (editor) {
			editor.execCommand('table.insert', {
				rows: tableRows,
				columns: tableCols,
				header: tableHeader
			});
			showTableModal = false;
		}
	}

	function insertFootnote() {
		if (!editor) return;
		showFootnoteModal = true;
	}

	function openFindReplace() {
		if (!editor) return;
		editor.execCommand('findReplace.open');
		showFindReplace = true;
	}

	function closeFindReplace() {
		editor?.execCommand('findReplace.close');
		showFindReplace = false;
	}

	function clearFormatting() {
		editor?.transforms.clearFormatting();
	}

	function clearStyles() {
		editor?.clearStyles();
	}

	function setStyle(property: string, value?: string) {
		if (!editor) return;
		if (property === 'text-align') {
			editor.setBlockStyle(property, value);
		} else {
			editor.setInlineStyle(property, value);
		}
	}

	function toggleBlock(tagName: string) {
		const ed = editor;
		if (!ed) return;
		if (tagName === 'pre') {
			ed.runTransaction(() => {
				const block = ed.query.getCurrentBlock();
				if (!(block instanceof HTMLElement) || block === ed.root) return;
				const currentTag = block.tagName.toUpperCase();
				const nextTag = currentTag === 'PRE' ? 'P' : 'PRE';
				const newBlock = ed.createEl(nextTag.toLowerCase() as any);
				if (block.getAttribute('style')) {
					newBlock.setAttribute('style', block.getAttribute('style') ?? '');
				}
				while (block.firstChild) newBlock.appendChild(block.firstChild);
				block.replaceWith(newBlock);
			});
			return;
		}
		ed.toggleBlockFormat(tagName);
	}

	function toggleMark(tagName: string) {
		editor?.transforms.toggleMark(tagName);
	}

	function toggleList(tagName: 'ul' | 'ol') {
		if (!editor) return;
		editor.execCommand(tagName === 'ul' ? 'list.toggleUnordered' : 'list.toggleOrdered');
	}

	function outdent() {
		editor?.execCommand('list.outdent');
	}

	function indent() {
		editor?.execCommand('list.indent');
	}

	function undo() {
		editor?.execCommand('history.undo');
	}

	function redo() {
		editor?.execCommand('history.redo');
	}

	function deleteTable() {
		const ed = editor;
		if (!ed) return;
		ed.runTransaction(() => {
			const table = ed.query.findClosest('TABLE');
			if (table instanceof HTMLTableElement) {
				table.remove();
			}
		});
	}
</script>

<div class="rich-text-editor {className}">
<Card>
	<CardContent>
		<Toolbar
			{editor}
			{activeBlock}
			{activeList}
			{bold}
			{italic}
			{underline}
			{strike}
			{code}
			{sub}
			{sup}
			{link}
			{imageSelected}
			{color}
			{backgroundColor}
			{fontSize}
			{fontFamily}
			{textAlign}
			{canUndo}
			{canRedo}
			onUndo={undo}
			onRedo={redo}
			onSetStyle={setStyle}
			onToggleBlock={toggleBlock}
			onToggleMark={toggleMark}
			onToggleList={toggleList}
			onOutdent={outdent}
			onIndent={indent}
			onInsertLink={insertLink}
			onInsertImage={insertImage}
			onInsertTable={insertTable}
			onInsertFootnote={insertFootnote}
			onOpenFindReplace={openFindReplace}
			onClearFormatting={clearFormatting}
			onClearStyles={clearStyles}
		/>

		<FindReplace {editor} bind:open={showFindReplace} onClose={closeFindReplace} />

		<div class="rte-editor-shell">
			<div
				bind:this={editorElement}
				class="halka-editor rte-editor-area"
				style="font-family: ui-sans-serif, system-ui, sans-serif;"
				contenteditable="true"
			></div>
			<TableFloatingToolbar {editor} {tableActive} onDeleteTable={deleteTable} />
		</div>
	</CardContent>
</Card>
</div>

<!-- Modals -->
<Dialog
	open={showLinkModal}
	title="Insert Link"
	description="Enter the URL for the link."
	onClose={() => (showLinkModal = false)}
	footer={linkModalFooter}
>
	<div class="rte-form-stack">
		<div class="rte-form-field">
			<label for="link-url" class="rte-label">URL</label>
			<input
				id="link-url"
				type="url"
				placeholder="https://example.com"
				class="rte-input"
				bind:value={linkUrl}
				onkeydown={(e) => e.key === 'Enter' && handleLinkSubmit()}
			/>
		</div>
	</div>
</Dialog>

<Dialog
	open={showImageModal}
	title={imageEditing ? 'Edit Image' : 'Insert Image'}
	description={imageEditing
		? 'Update the image URL, alt text, layout, and optional sizing.'
		: 'Enter the image URL, choose inline or block layout, and optional sizing.'}
	onClose={() => {
		showImageModal = false;
		resetImageForm();
	}}
	footer={imageModalFooter}
>
	<div class="rte-form-stack">
		<div class="rte-form-field">
			<label for="image-url" class="rte-label">Image URL</label>
			<input
				id="image-url"
				type="url"
				placeholder="https://example.com/image.jpg"
				class="rte-input"
				bind:value={imageUrl}
				onkeydown={(e) => e.key === 'Enter' && handleImageSubmit()}
			/>
		</div>
		<div class="rte-form-field">
			<label for="image-alt" class="rte-label">Alt text</label>
			<input
				id="image-alt"
				type="text"
				placeholder="Describe the image"
				class="rte-input"
				bind:value={imageAlt}
				onkeydown={(e) => e.key === 'Enter' && handleImageSubmit()}
			/>
		</div>
		<div class="rte-form-field">
			<label for="image-layout" class="rte-label">Layout</label>
			<select id="image-layout" class="rte-input" bind:value={imageLayout}>
				<option value="inline">Inline in text</option>
				<option value="block">Block (own line)</option>
			</select>
		</div>
		<div class="rte-form-grid">
			<div class="rte-form-field">
				<label for="image-width" class="rte-label">Width</label>
				<input
					id="image-width"
					type="text"
					placeholder="e.g. 300px, 50%"
					class="rte-input"
					bind:value={imageWidth}
				/>
			</div>
			<div class="rte-form-field">
				<label for="image-height" class="rte-label">Height</label>
				<input
					id="image-height"
					type="text"
					placeholder="e.g. 200px, auto"
					class="rte-input"
					bind:value={imageHeight}
				/>
			</div>
		</div>
		<div class="rte-form-field">
			<label for="image-max-width" class="rte-label">Max width</label>
			<input
				id="image-max-width"
				type="text"
				placeholder="e.g. 100%"
				class="rte-input"
				bind:value={imageMaxWidth}
			/>
		</div>
	</div>
</Dialog>

<Dialog
	open={showTableModal}
	title="Insert Table"
	description="Configure your table dimensions."
	onClose={() => (showTableModal = false)}
	footer={tableModalFooter}
>
	<div class="rte-form-grid">
		<div class="rte-form-field">
			<label for="table-rows" class="rte-label">Rows</label>
			<input
				id="table-rows"
				type="number"
				min="1"
				max="20"
				class="rte-input"
				bind:value={tableRows}
			/>
		</div>
		<div class="rte-form-field">
			<label for="table-cols" class="rte-label">Columns</label>
			<input
				id="table-cols"
				type="number"
				min="1"
				max="20"
				class="rte-input"
				bind:value={tableCols}
			/>
		</div>
		<div class="rte-form-grid-full">
			<input
				id="table-header"
				type="checkbox"
				class="rte-checkbox"
				bind:checked={tableHeader}
			/>
			<label for="table-header" class="rte-label">Include Header</label>
		</div>
	</div>
</Dialog>

<FootnoteManager
	{editor}
	bind:open={showFootnoteModal}
	onClose={() => (showFootnoteModal = false)}
/>

{#snippet linkModalFooter()}
	<Button variant="outline" onclick={() => (showLinkModal = false)}>Cancel</Button>
	<Button onclick={handleLinkSubmit}>Insert</Button>
{/snippet}

{#snippet imageModalFooter()}
	<Button
		variant="outline"
		onclick={() => {
			showImageModal = false;
			resetImageForm();
		}}>Cancel</Button
	>
	<Button onclick={handleImageSubmit}>{imageEditing ? 'Update' : 'Insert'}</Button>
{/snippet}

{#snippet tableModalFooter()}
	<Button variant="outline" onclick={() => (showTableModal = false)}>Cancel</Button>
	<Button onclick={handleTableSubmit}>Insert</Button>
{/snippet}
