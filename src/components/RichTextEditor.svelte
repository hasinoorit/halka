<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { HalkaEditor } from '$lib/index.js';
	import { historyPlugin } from '$lib/plugins/history.js';
	import { pastePlugin } from '$lib/plugins/paste.js';
	import { placeholderPlugin } from '$lib/plugins/placeholder.js';
	import { linkPlugin } from '$lib/plugins/link.js';
	import { listPlugin } from '$lib/plugins/list.js';
	import { imagePlugin } from '$lib/plugins/image.js';
	import { tablePlugin } from '$lib/plugins/table.js';
	import { footnotePlugin } from '$lib/plugins/footnote.js';
	import {markdownShortcutsPlugin} from "$lib/plugins/markdown-shortcuts.js";
	import Button from './ui/button.svelte';
	import ColorPicker from './ui/color-picker.svelte';
	import Card from './ui/card.svelte';
	import CardContent from './ui/card-content.svelte';
	import Dialog from './ui/dialog.svelte';
	import Dropdown from './ui/dropdown.svelte';
	import FootnoteManager from './FootnoteManager.svelte';

	interface Props {
		content?: string;
		class?: string;
		placeholder?: string;
		onChange?: (html: string) => void;
	}

	let { content = $bindable(''), class: className = '', placeholder, onChange }: Props = $props();

	let editorElement = $state<HTMLElement>();
	let editor = $state<HalkaEditor>();

	let activeBlock = $state<string | null>(null);
	let activeList = $state<'ul' | 'ol' | null>(null);
	let isTableSelected = $state(false);

	// Formatting States
	let bold = $state(false);
	let italic = $state(false);
	let underline = $state(false);
	let strike = $state(false);
	let code = $state(false);
	let sub = $state(false);
	let sup = $state(false);

	let link = $state(false);

	// Style States
	let color = $state('#000000');
	let backgroundColor = $state('#ffffff');
	let fontSize = $state('16px');
	let fontFamily = $state('ui-sans-serif');
	let textAlign = $state('left');

	// Modal states
	let showLinkModal = $state(false);
	let linkUrl = $state('');
	let showImageModal = $state(false);
	let imageUrl = $state('');
	let showTableModal = $state(false);
	let tableRows = $state(3);
	let tableCols = $state(3);
	let tableHeader = $state(true);
	let showFootnoteModal = $state(false);

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

		// Table detection
		isTableSelected = editor.query.findClosest('TABLE') !== null;

		const list = editor.query.matchPath(
			(node) => node instanceof HTMLElement && (node.tagName === 'UL' || node.tagName === 'OL')
		);
		activeList = list instanceof HTMLElement ? (list.tagName.toLowerCase() as 'ul' | 'ol') : null;

		const block = editor.query.getCurrentBlock();
		if (block instanceof HTMLElement) {
			activeBlock = block.tagName === 'LI' ? 'p' : block.tagName.toLowerCase();
		} else {
			activeBlock = null;
		}
		color = rgbToHex(editor.getStyle('color') || '') || '#000000';
		backgroundColor = rgbToHex(editor.getStyle('background-color') || '') || '#ffffff';
		fontSize = editor.getStyle('font-size') || '16px';
		fontFamily = (editor.getStyle('font-family') || 'ui-sans-serif').replace(/['"]/g, '');
		textAlign = editor.getStyle('text-align') || 'left';

		if (editorElement) {
			const html = editorElement.innerHTML;
			if (content !== html) {
				content = html;
				onChange?.(html);
			}
		}
	}

	onMount(() => {
		if (editorElement) {
			editor = new HalkaEditor(editorElement, {
				plugins: [
					historyPlugin,
					pastePlugin,
					linkPlugin,
					listPlugin,
					imagePlugin,
					tablePlugin,
					footnotePlugin,
					markdownShortcutsPlugin,
					...(placeholder ? [placeholderPlugin(placeholder)] : [])
				]
			});

			if (content) editor.setHTML(content);
			editor.on('change', refresh);
			editor.on('formatChange', refresh);
			refresh();
		}
	});

	onDestroy(() => {
		if (editor) {
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

	function insertImage() {
		if (!editor) return;
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
			editor.execCommand('image.insert', { src: imageUrl });
			imageUrl = '';
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

	function clearFormatting() {
		const ed = editor;
		if (!ed) return;
		['STRONG', 'EM', 'U', 'S', 'CODE', 'SUB', 'SUP'].forEach((tag) => {
			if (ed.query.isActive(tag)) ed.transforms.toggleMark(tag);
		});
		['color', 'background-color', 'font-size', 'font-family'].forEach((style) => {
			ed.setInlineStyle(style);
		});
		ed.setBlockStyle('text-align');
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

<Card className={`border-border shadow-sm ${className}`}>
	<CardContent className="p-0">
		<!-- Toolbar -->
		<div class="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
			<!-- History -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onclick={undo}
					title="Undo"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg
					>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onclick={redo}
					title="Redo"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7" /></svg
					>
				</Button>
			</div>

			<!-- Font Controls -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<select
					class="h-8 pr-6 rounded-md border border-input bg-background px-2 text-sm text-foreground leading-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					value={fontFamily}
					onchange={(e) => setStyle('font-family', e.currentTarget.value)}
					title="Font Family"
				>
					<option
						value="ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
						>Sans Serif</option
					>
					<option value="ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif">Serif</option>
					<option
						value="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
						>Monospace</option
					>
				</select>
				<select
					class="h-8 pr-6 rounded-md border border-input bg-background px-2 text-sm text-foreground leading-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					value={fontSize}
					onchange={(e) => setStyle('font-size', e.currentTarget.value)}
					title="Font Size"
				>
					<option value="12px">12px</option>
					<option value="14px">14px</option>
					<option value="16px">16px</option>
					<option value="18px">18px</option>
					<option value="20px">20px</option>
					<option value="24px">24px</option>
					<option value="30px">30px</option>
				</select>
			</div>

			<!-- Block Types -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<select
					class="h-8 pr-6 rounded-md border border-input bg-background px-2 text-sm text-foreground leading-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					value={activeBlock || 'p'}
					onchange={(e) => toggleBlock(e.currentTarget.value)}
				>
					<option value="p">Paragraph</option>
					<option value="h1">Heading 1</option>
					<option value="h2">Heading 2</option>
					<option value="h3">Heading 3</option>
					<option value="blockquote">Quote</option>
					<option value="pre">Code Block</option>
				</select>
			</div>

			<!-- Inline Formatting -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<Button
					variant={bold ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => toggleMark('STRONG')}
					title="Bold"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path
							d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"
						/></svg
					>
				</Button>
				<Button
					variant={italic ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => toggleMark('EM')}
					title="Italic"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line
							x1="15"
							y1="4"
							x2="9"
							y2="20"
						/></svg
					>
				</Button>
				<Button
					variant={underline ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => toggleMark('U')}
					title="Underline"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line
							x1="4"
							y1="21"
							x2="20"
							y2="21"
						/></svg
					>
				</Button>
				<Button
					variant={strike ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => toggleMark('S')}
					title="Strikethrough"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line
							x1="4"
							y1="12"
							x2="20"
							y2="12"
						/></svg
					>
				</Button>
				<Button
					variant={code ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => toggleMark('CODE')}
					title="Code"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg
					>
				</Button>
				<Button
					variant={sub ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => toggleMark('SUB')}
					title="Subscript"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="m4 5 6 6" /><path d="m4 11 6-6" /><path d="M16 19h4" /><path
							d="M20 19v-4a2 2 0 0 0-4 0"
						/></svg
					>
				</Button>
				<Button
					variant={sup ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => toggleMark('SUP')}
					title="Superscript"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="m4 19 6-6" /><path d="m4 13 6 6" /><path d="M16 9V5a2 2 0 0 1 2-2h2" /></svg
					>
				</Button>
			</div>

			<!-- Colors -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<ColorPicker
					bind:value={color}
					label="T"
					className="h-8 w-8 p-0"
					onSelectColor={(c) => {
						setStyle('color', c);
					}}
					onClearColor={() => {
						setStyle('color');
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="1.2rem"
						height="1.2rem"
						viewBox="0 0 24 24"
						fill="none"
					>
						<path
							d="M6 18L10.8 6h2.4L18 18h-2.2l-1.2-3.5H9.4L8.2 18H6zm4.1-5.5h3.8L12 7.8l-1.9 4.7z"
							fill="currentColor"
						/>
						<rect x="4" y="20" width="16" height="3" rx="0.5" fill={color} />
					</svg>
				</ColorPicker>
				<ColorPicker
					className="h-8 w-8 p-0"
					bind:value={backgroundColor}
					onSelectColor={(c) => {
						setStyle('background-color', c);
					}}
					onClearColor={() => {
						setStyle('background-color');
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="1.2rem"
						height="1.2rem"
						viewBox="0 0 24 24"
						fill="none"
					>
						<rect x="3" y="11" width="18" height="8" rx="1" fill="currentColor" opacity="0.25" />
						<path
							d="M6 18L10.8 6h2.4L18 18h-2.2l-1.2-3.5H9.4L8.2 18H6zm4.1-5.5h3.8L12 7.8l-1.9 4.7z"
							fill="currentColor"
						/>
						<rect x="4" y="20" width="16" height="3" rx="0.5" fill={backgroundColor} />
					</svg>
				</ColorPicker>
			</div>

			<!-- Alignment -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<Button
					variant={textAlign === 'left' ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => setStyle('text-align', 'left')}
					title="Align Left"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="21" y1="6" x2="3" y2="6" /><line x1="15" y1="12" x2="3" y2="12" /><line
							x1="17"
							y1="18"
							x2="3"
							y2="18"
						/></svg
					>
				</Button>
				<Button
					variant={textAlign === 'center' ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => setStyle('text-align', 'center')}
					title="Align Center"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="21" y1="6" x2="3" y2="6" /><line x1="19" y1="12" x2="5" y2="12" /><line
							x1="21"
							y1="18"
							x2="3"
							y2="18"
						/></svg
					>
				</Button>
				<Button
					variant={textAlign === 'right' ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => setStyle('text-align', 'right')}
					title="Align Right"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="12" x2="9" y2="12" /><line
							x1="21"
							y1="18"
							x2="7"
							y2="18"
						/></svg
					>
				</Button>
				<Button
					variant={textAlign === 'justify' ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => setStyle('text-align', 'justify')}
					title="Align Justify"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line
							x1="3"
							y1="18"
							x2="21"
							y2="18"
						/></svg
					>
				</Button>
			</div>

			<!-- Lists -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<Button
					variant={activeList === 'ul' ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => toggleList('ul')}
					title="Bullet List"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line
							x1="8"
							y1="18"
							x2="21"
							y2="18"
						/><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line
							x1="3"
							y1="18"
							x2="3.01"
							y2="18"
						/></svg
					>
				</Button>
				<Button
					variant={activeList === 'ol' ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={() => toggleList('ol')}
					title="Ordered List"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line
							x1="10"
							y1="18"
							x2="21"
							y2="18"
						/><path d="M4 6h1v4" /><path d="M4 10h2" /><path
							d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"
						/></svg
					>
				</Button>
			</div>

			<!-- Indentation -->
			<div class="flex items-center gap-1 border-r pr-2 mr-1">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onclick={outdent}
					title="Outdent"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><polyline points="7 8 3 12 7 16" /><line x1="21" y1="12" x2="3" y2="12" /><line
							x1="21"
							y1="6"
							x2="11"
							y2="6"
						/><line x1="21" y1="18" x2="11" y2="18" /></svg
					>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onclick={indent}
					title="Indent"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><polyline points="17 8 21 12 17 16" /><line x1="3" y1="12" x2="21" y2="12" /><line
							x1="3"
							y1="6"
							x2="13"
							y2="6"
						/><line x1="3" y1="18" x2="13" y2="18" /></svg
					>
				</Button>
			</div>

			<!-- Media & Tables -->
			<div class="flex items-center gap-1">
				<Button
					variant={link ? 'secondary' : 'ghost'}
					size="icon"
					className="h-8 w-8"
					onclick={insertLink}
					title="Link"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
							d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
						/></svg
					>
				</Button>
				<Button variant="ghost" size="icon" className="h-8 w-8" onclick={insertImage} title="Image">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle
							cx="9"
							cy="9"
							r="2"
						/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg
					>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onclick={insertTable}
					title="Insert Table"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path
							d="M3 15h18"
						/><path d="M9 3v18" /><path d="M15 3v18" /></svg
					>
				</Button>

				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onclick={insertFootnote}
					title="Insert Footnote"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /><path
							d="M8 7h6"
						/><path d="M8 11h6" /></svg
					>
				</Button>

				{#if isTableSelected}
					<Dropdown
						trigger={tableActionsTrigger}
						items={[
							{
								label: 'Insert Row Above',
								onclick: () => {
									editor?.execCommand('table.addRow', false);
								},
								icon: rowAboveIcon
							},
							{
								label: 'Insert Row Below',
								onclick: () => {
									editor?.execCommand('table.addRow', true);
								},
								icon: rowBelowIcon
							},
							{
								label: 'Insert Column Left',
								onclick: () => {
									editor?.execCommand('table.addColumn', false);
								},
								icon: colLeftIcon
							},
							{
								label: 'Insert Column Right',
								onclick: () => {
									editor?.execCommand('table.addColumn', true);
								},
								icon: colRightIcon
							},
							{
								label: 'Merge Cells',
								onclick: () => {
									editor?.execCommand('table.mergeCells');
								},
								icon: mergeIcon
							},
							{
								label: 'Delete Row',
								onclick: () => {
									editor?.execCommand('table.removeRow');
								},
								variant: 'destructive',
								icon: deleteIcon
							},
							{
								label: 'Delete Column',
								onclick: () => {
									editor?.execCommand('table.removeColumn');
								},
								variant: 'destructive',
								icon: deleteIcon
							},
							{
								label: 'Delete Table',
								onclick: () => {
									deleteTable();
								},
								variant: 'destructive',
								icon: deleteIcon
							}
						]}
					/>
				{/if}
			</div>

			<!-- Clear Formatting -->
			<div class="flex items-center gap-1 ml-auto">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onclick={clearFormatting}
					title="Clear Formatting"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /><line
							x1="8"
							y1="21"
							x2="22"
							y2="21"
						/></svg
					>
				</Button>
			</div>
		</div>

		<!-- Editor Area -->
		<div
			bind:this={editorElement}
			class="halka-editor min-h-[500px] w-full p-8"
			style="font-family: ui-sans-serif, system-ui, sans-serif;"
		></div>
	</CardContent>
</Card>

<!-- Modals -->
<Dialog
	open={showLinkModal}
	title="Insert Link"
	description="Enter the URL for the link."
	onClose={() => (showLinkModal = false)}
	footer={linkModalFooter}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<label for="link-url" class="text-sm font-medium">URL</label>
			<input
				id="link-url"
				type="url"
				placeholder="https://example.com"
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				bind:value={linkUrl}
				onkeydown={(e) => e.key === 'Enter' && handleLinkSubmit()}
			/>
		</div>
	</div>
</Dialog>

<Dialog
	open={showImageModal}
	title="Insert Image"
	description="Enter the URL for the image."
	onClose={() => (showImageModal = false)}
	footer={imageModalFooter}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<label for="image-url" class="text-sm font-medium">Image URL</label>
			<input
				id="image-url"
				type="url"
				placeholder="https://example.com/image.jpg"
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				bind:value={imageUrl}
				onkeydown={(e) => e.key === 'Enter' && handleImageSubmit()}
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
	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2">
			<label for="table-rows" class="text-sm font-medium">Rows</label>
			<input
				id="table-rows"
				type="number"
				min="1"
				max="20"
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				bind:value={tableRows}
			/>
		</div>
		<div class="space-y-2">
			<label for="table-cols" class="text-sm font-medium">Columns</label>
			<input
				id="table-cols"
				type="number"
				min="1"
				max="20"
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				bind:value={tableCols}
			/>
		</div>
		<div class="col-span-2 flex items-center space-x-2">
			<input
				id="table-header"
				type="checkbox"
				class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
				bind:checked={tableHeader}
			/>
			<label for="table-header" class="text-sm font-medium leading-none">Include Header</label>
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
	<Button variant="outline" onclick={() => (showImageModal = false)}>Cancel</Button>
	<Button onclick={handleImageSubmit}>Insert</Button>
{/snippet}

{#snippet tableModalFooter()}
	<Button variant="outline" onclick={() => (showTableModal = false)}>Cancel</Button>
	<Button onclick={handleTableSubmit}>Insert</Button>
{/snippet}

{#snippet tableActionsTrigger()}
	<Button variant="secondary" size="sm" className="h-8 gap-1 px-2 ml-1">
		Table
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
		>
	</Button>
{/snippet}

{#snippet rowAboveIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 15h18" /><path
			d="M3 9h18"
		/><path d="M21 9v6" /><path d="M3 9v6" /><path d="M12 9v6" /></svg
	>
{/snippet}

{#snippet rowBelowIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 15h18" /><path
			d="M3 9h18"
		/><path d="M12 9v6" /></svg
	>
{/snippet}

{#snippet colLeftIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M15 3v18" /><path
			d="M9 3v18"
		/><path d="M9 3h6" /><path d="M9 21h6" /><path d="M9 12h6" /></svg
	>
{/snippet}

{#snippet colRightIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M15 3v18" /><path
			d="M9 3v18"
		/><path d="M9 12h6" /></svg
	>
{/snippet}

{#snippet mergeIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 12h18" /><path
			d="M12 3v18"
		/></svg
	>
{/snippet}

{#snippet deleteIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
			d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
		/></svg
	>
{/snippet}
