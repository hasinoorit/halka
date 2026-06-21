<script lang="ts">
	import type { HalkaEditor } from 'halka';
	import type { FindReplaceState } from 'halka/plugins/find-replace';
	import Button from './ui/button.svelte';

	interface Props {
		editor: HalkaEditor | undefined;
		open: boolean;
		onClose: () => void;
	}

	let { editor, open = $bindable(), onClose }: Props = $props();

	let query = $state('');
	let replacement = $state('');
	let caseSensitive = $state(false);
	let wholeWord = $state(false);
	let status = $state<FindReplaceState | null>(null);

	$effect(() => {
		if (!open || !editor) return;
		const state = editor.getState('findReplace.state') as FindReplaceState | undefined;
		if (!state) return;

		query = state.query;
		replacement = state.replacement;
		caseSensitive = state.caseSensitive;
		wholeWord = state.wholeWord;
		status = state;
	});

	function syncOptions() {
		editor?.execCommand('findReplace.setOptions', {
			query,
			replacement,
			caseSensitive,
			wholeWord
		});
		refreshStatus();
	}

	function refreshStatus() {
		if (!editor) return;
		status = (editor.getState('findReplace.state') as FindReplaceState | undefined) ?? null;
	}

	function handleFind() {
		syncOptions();
		editor?.execCommand('findReplace.find');
		refreshStatus();
	}

	function handleFindNext() {
		syncOptions();
		editor?.execCommand('findReplace.findNext');
		refreshStatus();
	}

	function handleFindPrevious() {
		syncOptions();
		editor?.execCommand('findReplace.findPrevious');
		refreshStatus();
	}

	function handleReplace() {
		syncOptions();
		editor?.execCommand('findReplace.replace');
		refreshStatus();
	}

	function handleReplaceAll() {
		syncOptions();
		editor?.execCommand('findReplace.replaceAll');
		refreshStatus();
	}

	function handleQueryKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (event.shiftKey) {
				handleFindPrevious();
			} else {
				handleFindNext();
			}
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
		}
	}

	function handleReplaceKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleReplace();
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
		}
	}

	const matchLabel = $derived.by(() => {
		if (!status?.query) return '';
		if (status.matchCount === 0) return 'No matches';
		if (status.currentIndex < 0) return `${status.matchCount} matches`;
		return `${status.currentIndex + 1} of ${status.matchCount}`;
	});
</script>

{#if open}
	<div class="rte-find-bar" role="search">
		<div class="rte-find-bar-row">
			<label class="rte-find-label" for="rte-find-query">Find</label>
			<input
				id="rte-find-query"
				class="rte-input rte-find-input"
				type="text"
				placeholder="Search..."
				bind:value={query}
				oninput={syncOptions}
				onkeydown={handleQueryKeydown}
			/>
			<span class="rte-find-status">{matchLabel}</span>
		</div>

		<div class="rte-find-bar-row">
			<label class="rte-find-label" for="rte-find-replace">Replace</label>
			<input
				id="rte-find-replace"
				class="rte-input rte-find-input"
				type="text"
				placeholder="Replace with..."
				bind:value={replacement}
				oninput={syncOptions}
				onkeydown={handleReplaceKeydown}
			/>
		</div>

		<div class="rte-find-bar-options">
			<label class="rte-find-checkbox">
				<input type="checkbox" bind:checked={caseSensitive} onchange={syncOptions} />
				Match case
			</label>
			<label class="rte-find-checkbox">
				<input type="checkbox" bind:checked={wholeWord} onchange={syncOptions} />
				Whole word
			</label>
		</div>

		<div class="rte-find-bar-actions">
			<Button variant="outline" size="sm" onclick={handleFindPrevious}>Previous</Button>
			<Button variant="outline" size="sm" onclick={handleFindNext}>Next</Button>
			<Button variant="outline" size="sm" onclick={handleReplace}>Replace</Button>
			<Button variant="outline" size="sm" onclick={handleReplaceAll}>Replace All</Button>
			<Button variant="ghost" size="sm" onclick={onClose}>Close</Button>
		</div>
	</div>
{/if}

<style>
	.rte-find-bar {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid var(--rte-border, #e2e8f0);
		border-radius: var(--rte-radius, 0.5rem);
		background: var(--rte-muted, #f8fafc);
		margin-bottom: 0.75rem;
	}

	.rte-find-bar-row {
		display: grid;
		grid-template-columns: 4.5rem 1fr auto;
		align-items: center;
		gap: 0.5rem;
	}

	.rte-find-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--rte-foreground, #0f172a);
	}

	.rte-find-input {
		width: 100%;
	}

	.rte-find-status {
		font-size: 0.75rem;
		color: var(--rte-muted-foreground, #64748b);
		white-space: nowrap;
		min-width: 5rem;
		text-align: right;
	}

	.rte-find-bar-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding-left: 4.5rem;
	}

	.rte-find-checkbox {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--rte-foreground, #0f172a);
	}

	.rte-find-bar-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-left: 4.5rem;
	}
</style>
