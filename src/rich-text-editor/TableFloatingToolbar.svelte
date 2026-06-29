<script lang="ts">
	import { computePosition, offset, flip, shift, autoUpdate } from '@floating-ui/dom';
	import type { HalkaEditor } from 'halka';
	import type { TableActiveState } from 'halka/plugins/table';
	import Button from './ui/button.svelte';
	import Dropdown from './ui/dropdown.svelte';
	import TableStyleDialog from './TableStyleDialog.svelte';

	interface Props {
		editor: HalkaEditor | undefined;
		tableActive: TableActiveState | null;
		onDeleteTable: () => void;
	}

	let { editor, tableActive, onDeleteTable }: Props = $props();

	let toolbarEl = $state<HTMLDivElement | null>(null);
	let styleDialogOpen = $state(false);
	let styleDialogTarget = $state<'table' | 'row' | 'cell'>('table');
	let tableMenuOpen = $state(false);
	let rowMenuOpen = $state(false);
	let cellMenuOpen = $state(false);

	let visible = $derived(tableActive !== null);
	let hasCell = $derived(
		tableActive?.cell !== null || (tableActive?.canMerge ?? false)
	);
	let canSplit = $derived(tableActive?.cell?.isMerged ?? false);
	let canMerge = $derived(tableActive?.canMerge ?? false);

	function openStyleDialog(target: 'table' | 'row' | 'cell') {
		tableMenuOpen = false;
		rowMenuOpen = false;
		cellMenuOpen = false;
		styleDialogTarget = target;
		styleDialogOpen = true;
	}

	function closeStyleDialog() {
		styleDialogOpen = false;
	}

	function getReferenceElement(): HTMLElement | null {
		if (!editor) return null;

		const cell = editor.query.matchPath(
			(node): node is HTMLTableCellElement => node instanceof HTMLTableCellElement
		);
		if (cell instanceof HTMLTableCellElement) {
			return cell;
		}

		const table = editor.query.findClosest('TABLE');
		return table instanceof HTMLTableElement ? table : null;
	}

	function updatePosition() {
		if (!toolbarEl || !editor) return;

		const reference = getReferenceElement();
		if (!reference) return;

		computePosition(reference, toolbarEl, {
			placement: 'top',
			strategy: 'fixed',
			middleware: [
				offset(8),
				flip({ fallbackPlacements: ['bottom', 'top'] }),
				shift({ padding: 8 })
			]
		}).then(({ x, y }) => {
			if (!toolbarEl) return;
			Object.assign(toolbarEl.style, {
				left: `${x}px`,
				top: `${y}px`
			});
		});
	}

	$effect(() => {
		if (!visible || !editor || !toolbarEl) return;

		const reference = getReferenceElement();
		if (!reference) return;

		updatePosition();

		const cleanup = autoUpdate(reference, toolbarEl, updatePosition, {
			animationFrame: true
		});

		const doc = editor.root.ownerDocument;
		const onSelectionChange = () => updatePosition();
		doc.addEventListener('selectionchange', onSelectionChange);

		return () => {
			cleanup();
			doc.removeEventListener('selectionchange', onSelectionChange);
		};
	});

	function preventFocusLoss(event: MouseEvent) {
		event.preventDefault();
	}
</script>

{#snippet menuAction(label: string, onclick: () => void, options: { destructive?: boolean; disabled?: boolean } = {})}
	<button
		class="rte-table-menu-action"
		class:rte-table-menu-action--destructive={options.destructive}
		class:rte-table-menu-action--disabled={options.disabled}
		disabled={options.disabled}
		type="button"
		onclick={() => {
			if (options.disabled) return;
			onclick();
			tableMenuOpen = false;
			rowMenuOpen = false;
			cellMenuOpen = false;
		}}
	>
		{label}
	</button>
{/snippet}

{#snippet chevron()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="12"
		height="12"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		><path d="m6 9 6 6 6-6" /></svg
	>
{/snippet}

{#snippet tableTrigger()}
	<Button variant="secondary" size="sm" className="rte-table-floating-trigger">
		Table
		{@render chevron()}
	</Button>
{/snippet}

{#snippet rowTrigger()}
	<Button variant="secondary" size="sm" className="rte-table-floating-trigger" disabled={!hasCell}>
		Row
		{@render chevron()}
	</Button>
{/snippet}

{#snippet cellTrigger()}
	<Button variant="secondary" size="sm" className="rte-table-floating-trigger" disabled={!hasCell}>
		Cell
		{@render chevron()}
	</Button>
{/snippet}

{#if visible}
	<div
		bind:this={toolbarEl}
		class="rte-table-floating-toolbar"
		role="toolbar"
		aria-label="Table actions"
		onmousedown={preventFocusLoss}
	>
		<Dropdown trigger={tableTrigger} className="rte-table-floating-dropdown" bind:isOpen={tableMenuOpen}>
			{#snippet children()}
				<div class="rte-table-menu">
					<div class="rte-table-menu-section">
						<div class="rte-table-menu-heading">Actions</div>
						{@render menuAction('Style table…', () => openStyleDialog('table'))}
						{@render menuAction('Delete table', onDeleteTable, { destructive: true })}
					</div>
				</div>
			{/snippet}
		</Dropdown>

		<Dropdown
			trigger={rowTrigger}
			className="rte-table-floating-dropdown"
			disabled={!hasCell}
			bind:isOpen={rowMenuOpen}
		>
			{#snippet children()}
				<div class="rte-table-menu">
					<div class="rte-table-menu-section">
						<div class="rte-table-menu-heading">Actions</div>
						{@render menuAction('Style row…', () => openStyleDialog('row'))}
						{@render menuAction('Insert row above', () =>
							editor?.execCommand('table.addRow', false))}
						{@render menuAction('Insert row below', () =>
							editor?.execCommand('table.addRow', true))}
						{@render menuAction('Delete row', () =>
							editor?.execCommand('table.removeRow'), { destructive: true })}
					</div>
				</div>
			{/snippet}
		</Dropdown>

		<Dropdown
			trigger={cellTrigger}
			className="rte-table-floating-dropdown"
			disabled={!hasCell}
			bind:isOpen={cellMenuOpen}
		>
			{#snippet children()}
				<div class="rte-table-menu">
					<div class="rte-table-menu-section">
						<div class="rte-table-menu-heading">Actions</div>
						{@render menuAction('Style cell…', () => openStyleDialog('cell'))}
						{@render menuAction('Insert column left', () =>
							editor?.execCommand('table.addColumn', false))}
						{@render menuAction('Insert column right', () =>
							editor?.execCommand('table.addColumn', true))}
						{@render menuAction('Merge cells', () => editor?.execCommand('table.mergeCells'), {
							disabled: !canMerge
						})}
						{@render menuAction('Split cell', () => editor?.execCommand('table.splitCell'), {
							disabled: !canSplit
						})}
						{@render menuAction('Delete column', () =>
							editor?.execCommand('table.removeColumn'), { destructive: true })}
					</div>
				</div>
			{/snippet}
		</Dropdown>
	</div>
{/if}

<TableStyleDialog
	open={styleDialogOpen}
	{editor}
	target={styleDialogTarget}
	onClose={closeStyleDialog}
/>

<style>
	:global(.rte-table-floating-trigger) {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 1.75rem;
		padding: 0 0.625rem;
		font-size: 0.8125rem;
	}

	:global(.rte-table-floating-dropdown .rte-dropdown-menu) {
		min-width: 11rem;
		z-index: 60;
	}

	.rte-table-menu {
		display: flex;
		flex-direction: column;
	}

	.rte-table-menu-section {
		display: flex;
		flex-direction: column;
		padding: 0.25rem;
	}

	.rte-table-menu-heading {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--rte-muted-foreground, #64748b);
	}

	.rte-table-menu-action {
		display: flex;
		align-items: center;
		width: 100%;
		border: none;
		background: transparent;
		border-radius: 0.25rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.875rem;
		color: inherit;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s, color 0.15s;
	}

	.rte-table-menu-action:hover:not(:disabled) {
		background: var(--rte-accent, #f1f5f9);
	}

	.rte-table-menu-action--destructive {
		color: var(--rte-destructive, #ef4444);
	}

	.rte-table-menu-action--destructive:hover:not(:disabled) {
		background: var(--rte-destructive, #ef4444);
		color: var(--rte-destructive-foreground, #f8fafc);
	}

	.rte-table-menu-action--disabled,
	.rte-table-menu-action--disabled:hover {
		opacity: 0.5;
		cursor: not-allowed;
		background: transparent;
	}
</style>
