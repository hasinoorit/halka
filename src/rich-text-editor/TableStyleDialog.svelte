<script lang="ts">
	import type { HalkaEditor } from 'halka';
	import { ColorPicker, colorStore } from '../components/color-picker/index.js';
	import Dialog from './ui/dialog.svelte';
	import Button from './ui/button.svelte';

	interface Props {
		open: boolean;
		editor: HalkaEditor | undefined;
		target: 'table' | 'row' | 'cell';
		onClose: () => void;
	}

	let { open, editor, target, onClose }: Props = $props();

	const styleCommand = {
		table: 'table.styleTable',
		row: 'table.styleRow',
		cell: 'table.styleCell'
	} as const;

	const getStylesCommand = {
		table: 'table.getTableStyles',
		row: 'table.getRowStyles',
		cell: 'table.getCellStyles'
	} as const;

	const targetLabel = $derived(
		target === 'table' ? 'Table' : target === 'row' ? 'Row' : 'Cell'
	);

	let backgroundColor = $state('');
	let textColor = $state('');
	let borderColor = $state('');
	let textAlign = $state('left');
	let verticalAlign = $state('top');
	let borderCollapse = $state('collapse');
	let tableWidth = $state('100%');

	function rgbToHex(input: string): string | null {
		const s = input.trim().toLowerCase();
		if (s.startsWith('#')) return s;

		const match = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
		if (!match) return null;

		const r = Math.max(0, Math.min(255, parseInt(match[1], 10)));
		const g = Math.max(0, Math.min(255, parseInt(match[2], 10)));
		const b = Math.max(0, Math.min(255, parseInt(match[3], 10)));

		return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
	}

	function normalizeColorValue(value: string | undefined): string {
		if (!value) return '';
		if (value.startsWith('var(--colors-')) return value;
		return rgbToHex(value) || value;
	}

	function parseBorderColor(border: string | undefined): string {
		if (!border) return '';
		if (border.includes('var(--colors-')) {
			const match = border.match(/var\(--colors-[^)]+\)/);
			return match?.[0] || '';
		}
		const hex = border.match(/#[0-9a-f]{3,8}/i)?.[0];
		if (hex) return hex;
		const rgb = border.match(/rgba?\([^)]+\)/i)?.[0];
		return rgbToHex(rgb || '') || rgb || '';
	}

	function loadStyles() {
		if (!editor) return;

		editor.execCommand(getStylesCommand[target], {
			callback: (styles: Record<string, string>) => {
				backgroundColor = normalizeColorValue(styles['background-color']);
				borderColor = parseBorderColor(styles.border);

				if (target === 'cell') {
					textColor = normalizeColorValue(styles.color);
					textAlign = styles['text-align'] || 'left';
					verticalAlign = styles['vertical-align'] || 'top';
				}

				if (target === 'table') {
					borderCollapse = styles['border-collapse'] || 'collapse';
					tableWidth = styles.width || '100%';
				}
			}
		});
	}

	function setStyle(property: string, value?: string | null) {
		editor?.execCommand(styleCommand[target], { property, value: value ?? null });
	}

	$effect(() => {
		if (!editor) return;
		const doc = editor.root.ownerDocument;
		colorStore.registerDocument(doc);
		return () => colorStore.unregisterDocument(doc);
	});

	$effect(() => {
		if (open) {
			loadStyles();
		}
	});
</script>

{#snippet footer()}
	<Button variant="default" onclick={onClose}>Done</Button>
{/snippet}

<Dialog
	{open}
	title="{targetLabel} style"
	description="Customize the appearance of the selected {target}."
	overlayClass="rte-table-style-dialog-overlay"
	dialogClass="rte-table-style-dialog"
	{onClose}
	{footer}
>
	<div class="rte-table-style-form">
		<div class="rte-table-style-field rte-table-style-field--stacked">
			<span class="rte-table-style-label">Background</span>
			<ColorPicker
				value={backgroundColor}
				onchange={(color) => {
					backgroundColor = color;
					setStyle('background-color', color);
				}}
				onReset={() => {
					backgroundColor = '';
					setStyle('background-color', null);
				}}
			/>
		</div>

		{#if target === 'cell'}
			<div class="rte-table-style-field rte-table-style-field--stacked">
				<span class="rte-table-style-label">Text color</span>
				<ColorPicker
					value={textColor}
					onchange={(color) => {
						textColor = color;
						setStyle('color', color);
					}}
					onReset={() => {
						textColor = '';
						setStyle('color', null);
					}}
				/>
			</div>

			<div class="rte-table-style-field">
				<span class="rte-table-style-label">Text align</span>
				<div class="rte-table-style-align">
					{#each ['left', 'center', 'right'] as align}
						<Button
							variant={textAlign === align ? 'secondary' : 'outline'}
							size="sm"
							className="rte-table-style-align-btn"
							onclick={() => {
								textAlign = align;
								setStyle('text-align', align);
							}}
						>
							{align[0].toUpperCase() + align.slice(1)}
						</Button>
					{/each}
				</div>
			</div>

			<div class="rte-table-style-field">
				<span class="rte-table-style-label">Vertical align</span>
				<select
					class="rte-select rte-table-style-select"
					value={verticalAlign}
					onchange={(e) => {
						verticalAlign = e.currentTarget.value;
						setStyle('vertical-align', verticalAlign);
					}}
				>
					<option value="top">Top</option>
					<option value="middle">Middle</option>
					<option value="bottom">Bottom</option>
				</select>
			</div>

			<div class="rte-table-style-field rte-table-style-field--stacked">
				<span class="rte-table-style-label">Border</span>
				<ColorPicker
					value={borderColor}
					onchange={(color) => {
						borderColor = color;
						setStyle('border', `1px solid ${color}`);
					}}
					onReset={() => {
						borderColor = '';
						setStyle('border', null);
					}}
				/>
			</div>
		{/if}

		{#if target === 'row'}
			<div class="rte-table-style-field rte-table-style-field--stacked">
				<span class="rte-table-style-label">Border</span>
				<ColorPicker
					value={borderColor}
					onchange={(color) => {
						borderColor = color;
						setStyle('border', `1px solid ${color}`);
					}}
					onReset={() => {
						borderColor = '';
						setStyle('border', null);
					}}
				/>
			</div>
		{/if}

		{#if target === 'table'}
			<div class="rte-table-style-field">
				<span class="rte-table-style-label">Width</span>
				<select
					class="rte-select rte-table-style-select"
					value={tableWidth}
					onchange={(e) => {
						tableWidth = e.currentTarget.value;
						setStyle('width', tableWidth);
					}}
				>
					<option value="100%">Full width</option>
					<option value="auto">Auto</option>
				</select>
			</div>

			<div class="rte-table-style-field">
				<span class="rte-table-style-label">Border mode</span>
				<select
					class="rte-select rte-table-style-select"
					value={borderCollapse}
					onchange={(e) => {
						borderCollapse = e.currentTarget.value;
						setStyle('border-collapse', borderCollapse);
					}}
				>
					<option value="collapse">Collapse</option>
					<option value="separate">Separate</option>
				</select>
			</div>

			<div class="rte-table-style-field rte-table-style-field--stacked">
				<span class="rte-table-style-label">Border</span>
				<ColorPicker
					value={borderColor}
					onchange={(color) => {
						borderColor = color;
						setStyle('border', `1px solid ${color}`);
					}}
					onReset={() => {
						borderColor = '';
						setStyle('border', null);
					}}
				/>
			</div>
		{/if}
	</div>
</Dialog>

<style>
	:global(.rte-table-style-dialog-overlay) {
		z-index: 100;
	}

	:global(.rte-table-style-dialog) {
		max-width: 24rem;
	}

	.rte-table-style-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.rte-table-style-field {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.rte-table-style-field--stacked {
		flex-direction: column;
		align-items: stretch;
	}

	.rte-table-style-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--rte-foreground, #0f172a);
	}

	.rte-table-style-align {
		display: flex;
		gap: 0.25rem;
	}

	:global(.rte-table-style-align-btn) {
		min-width: 4.5rem;
	}

	.rte-table-style-select {
		min-width: 8rem;
		height: 2.25rem;
		padding: 0 0.5rem;
		font-size: 0.875rem;
	}
</style>
