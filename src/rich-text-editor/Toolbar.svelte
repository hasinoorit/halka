<script lang="ts">
	import type { HalkaEditor } from 'halka';
	import Button from './ui/button.svelte';
	import ColorPicker from './ui/color-picker.svelte';
	import Dropdown from './ui/dropdown.svelte';

	interface Props {
		editor: HalkaEditor | undefined;
		activeBlock: string | null;
		activeList: 'ul' | 'ol' | null;
		isTableSelected: boolean;
		bold: boolean;
		italic: boolean;
		underline: boolean;
		strike: boolean;
		code: boolean;
		sub: boolean;
		sup: boolean;
		link: boolean;
		color: string;
		backgroundColor: string;
		fontSize: string;
		fontFamily: string;
		textAlign: string;
		onUndo: () => void;
		onRedo: () => void;
		onSetStyle: (property: string, value?: string) => void;
		onToggleBlock: (tagName: string) => void;
		onToggleMark: (tagName: string) => void;
		onToggleList: (tagName: 'ul' | 'ol') => void;
		onOutdent: () => void;
		onIndent: () => void;
		onInsertLink: () => void;
		onInsertImage: () => void;
		onInsertTable: () => void;
		onInsertFootnote: () => void;
		onOpenFindReplace: () => void;
		onClearFormatting: () => void;
		onClearStyles: () => void;
		onDeleteTable: () => void;
	}

	let {
		editor,
		activeBlock,
		activeList,
		isTableSelected,
		bold,
		italic,
		underline,
		strike,
		code,
		sub,
		sup,
		link,
		color,
		backgroundColor,
		fontSize,
		fontFamily,
		textAlign,
		onUndo,
		onRedo,
		onSetStyle,
		onToggleBlock,
		onToggleMark,
		onToggleList,
		onOutdent,
		onIndent,
		onInsertLink,
		onInsertImage,
		onInsertTable,
		onInsertFootnote,
		onOpenFindReplace,
		onClearFormatting,
		onClearStyles,
		onDeleteTable
	}: Props = $props();
</script>

<div class="rte-toolbar">
	<!-- History -->
	<div class="rte-toolbar-group">
		<Button variant="ghost" size="icon" className="rte-btn--icon" onclick={onUndo} title="Undo">
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
		<Button variant="ghost" size="icon" className="rte-btn--icon" onclick={onRedo} title="Redo">
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
		<Button
			variant="ghost"
			size="icon"
			className="rte-btn--icon"
			onclick={onOpenFindReplace}
			title="Find and Replace (Ctrl+F)"
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
				><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg
			>
		</Button>
	</div>

	<!-- Font Controls -->
	<div class="rte-toolbar-group">
		<select
			class="rte-select"
			value={fontFamily}
			onchange={(e) => onSetStyle('font-family', e.currentTarget.value)}
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
			class="rte-select"
			value={fontSize}
			onchange={(e) => onSetStyle('font-size', e.currentTarget.value)}
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
	<div class="rte-toolbar-group">
		<select
			class="rte-select"
			value={activeBlock || 'p'}
			onchange={(e) => onToggleBlock(e.currentTarget.value)}
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
	<div class="rte-toolbar-group">
		<Button
			variant={bold ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => onToggleMark('STRONG')}
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
			className="rte-btn--icon"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => onToggleMark('EM')}
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
			className="rte-btn--icon"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => onToggleMark('U')}
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
				><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg
			>
		</Button>
		<Button
			variant={strike ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => onToggleMark('S')}
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
			className="rte-btn--icon"
			onclick={() => onToggleMark('CODE')}
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
			className="rte-btn--icon"
			onclick={() => onToggleMark('SUB')}
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
			className="rte-btn--icon"
			onclick={() => onToggleMark('SUP')}
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
		<Button
			variant="ghost"
			size="icon"
			className="rte-btn--icon"
			onmousedown={(e) => e.preventDefault()}
			onclick={onClearFormatting}
			title="Clear formatting"
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
				><path d="M4 7V4h16v3" /><path d="M5 20h6" /><path d="m9 20 5-12" /><path
					d="m15.5 11.5 3 3L22 11l-3-3"
				/></svg
			>
		</Button>
		<Button
			variant="ghost"
			size="icon"
			className="rte-btn--icon"
			onmousedown={(e) => e.preventDefault()}
			onclick={onClearStyles}
			title="Clear styles"
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
				><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path
					d="M22 21H7"
				/></svg
			>
		</Button>
	</div>

	<!-- Colors -->
	<div class="rte-toolbar-group">
		<ColorPicker
			value={color}
			label="T"
			className="rte-btn--icon"
			onSelectColor={(c) => onSetStyle('color', c)}
			onClearColor={() => onSetStyle('color')}
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
			className="rte-btn--icon"
			value={backgroundColor}
			onSelectColor={(c) => onSetStyle('background-color', c)}
			onClearColor={() => onSetStyle('background-color')}
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
	<div class="rte-toolbar-group">
		<Button
			variant={textAlign === 'left' ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon"
			onclick={() => onSetStyle('text-align', 'left')}
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
			className="rte-btn--icon"
			onclick={() => onSetStyle('text-align', 'center')}
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
			className="rte-btn--icon"
			onclick={() => onSetStyle('text-align', 'right')}
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
			className="rte-btn--icon"
			onclick={() => onSetStyle('text-align', 'justify')}
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
	<div class="rte-toolbar-group">
		<Button
			variant={activeList === 'ul' ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon"
			onclick={() => onToggleList('ul')}
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
			className="rte-btn--icon"
			onclick={() => onToggleList('ol')}
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
				/><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg
			>
		</Button>
	</div>

	<!-- Indentation -->
	<div class="rte-toolbar-group">
		<Button
			variant="ghost"
			size="icon"
			className="rte-btn--icon"
			onclick={onOutdent}
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
		<Button variant="ghost" size="icon" className="rte-btn--icon" onclick={onIndent} title="Indent">
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
	<div class="rte-toolbar-group rte-toolbar-group--no-border">
		<Button
			variant={link ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon"
			onclick={onInsertLink}
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
		<Button variant="ghost" size="icon" className="rte-btn--icon" onclick={onInsertImage} title="Image">
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
				><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path
					d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
				/></svg
			>
		</Button>
		<Button
			variant="ghost"
			size="icon"
			className="rte-btn--icon"
			onclick={onInsertTable}
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
			className="rte-btn--icon"
			onclick={onInsertFootnote}
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
						onclick: () => editor?.execCommand('table.addRow', false),
						icon: rowAboveIcon
					},
					{
						label: 'Insert Row Below',
						onclick: () => editor?.execCommand('table.addRow', true),
						icon: rowBelowIcon
					},
					{
						label: 'Insert Column Left',
						onclick: () => editor?.execCommand('table.addColumn', false),
						icon: colLeftIcon
					},
					{
						label: 'Insert Column Right',
						onclick: () => editor?.execCommand('table.addColumn', true),
						icon: colRightIcon
					},
					{
						label: 'Merge Cells',
						onclick: () => editor?.execCommand('table.mergeCells'),
						icon: mergeIcon
					},
					{
						label: 'Delete Row',
						onclick: () => editor?.execCommand('table.removeRow'),
						variant: 'destructive',
						icon: deleteIcon
					},
					{
						label: 'Delete Column',
						onclick: () => editor?.execCommand('table.removeColumn'),
						variant: 'destructive',
						icon: deleteIcon
					},
					{
						label: 'Delete Table',
						onclick: onDeleteTable,
						variant: 'destructive',
						icon: deleteIcon
					}
				]}
			/>
		{/if}
	</div>
</div>

{#snippet tableActionsTrigger()}
	<Button variant="secondary" size="sm" className="rte-btn--table-trigger">
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
