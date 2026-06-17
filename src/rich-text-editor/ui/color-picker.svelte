<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import Button from './button.svelte';

	interface Props {
		value?: string;
		label?: string;
		className?: string;
		onSelectColor?: (color: string) => void;
		onClearColor?: () => void;
		onOpen?: () => void;
		children?: Snippet;
	}

	let {
		value = $bindable('#000000'),
		label = '',
		className = '',
		onSelectColor,
		onClearColor,
		onOpen,
		children
	}: Props = $props();

	let isOpen = $state(false);
	let container: HTMLDivElement | undefined = $state();

	const presets = [
		'#000000', '#434343', '#666666', '#999999', '#b7b7b7',
		'#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
		'#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00',
		'#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
		'#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3',
		'#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
		'#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8',
		'#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
		'#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d',
		'#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
		'#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f',
		'#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
		'#85200c', '#990000', '#b45f06', '#bf9000', '#38761d',
		'#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
		'#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13',
		'#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
	];

	function toggle() {
		isOpen = !isOpen;
		if (isOpen && onOpen) onOpen();
	}

	function select(color: string) {
		value = color;
		onSelectColor?.(color);
		isOpen = false;
	}

	function clear() {
		onClearColor?.();
		isOpen = false;
	}

	function handleOutsideClick(event: MouseEvent) {
		if (isOpen && container && !container.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	onMount(() => {
		window.addEventListener('click', handleOutsideClick);
		return () => window.removeEventListener('click', handleOutsideClick);
	});
</script>

<div class="rte-color-picker {className}" bind:this={container}>
	<Button variant="outline" size="sm" className="rte-color-picker-trigger" onclick={toggle}>
		{#if children}
			{@render children?.()}
		{:else}
			<div class="rte-color-swatch" style="background-color: {value}"></div>
		{/if}
	</Button>

	{#if isOpen}
		<div class="rte-color-panel">
			<div class="rte-color-grid">
				{#each presets as color}
					<button
						class="rte-color-swatch-btn"
						style="background-color: {color}"
						title={color}
						onclick={() => select(color)}
						type="button"
					></button>
				{/each}
			</div>

			<div class="rte-color-footer">
				<div class="rte-color-custom">
					<span class="rte-color-custom-label">Custom</span>
					<input
						type="color"
						{value}
						class="rte-color-input"
						oninput={(e) => select(e.currentTarget.value)}
					/>
				</div>
				<Button variant="ghost" size="sm" className="rte-color-clear-btn" onclick={clear}>
					CLEAR
				</Button>
			</div>
		</div>
	{/if}
</div>

<style>
	.rte-color-picker {
		position: relative;
		display: inline-block;
	}

	:global(.rte-color-picker-trigger) {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0 0.5rem;
		height: 2rem;
	}

	.rte-color-swatch {
		width: 1rem;
		height: 1rem;
		border-radius: 0.125rem;
		border: 1px solid var(--rte-border, #e2e8f0);
	}

	.rte-color-panel {
		position: absolute;
		left: 0;
		margin-top: 0.5rem;
		z-index: 50;
		padding: 0.75rem;
		background: var(--rte-popover, #fff);
		color: var(--rte-popover-foreground, #0f172a);
		border: 1px solid var(--rte-border, #e2e8f0);
		border-radius: var(--rte-radius, 0.5rem);
		box-shadow: var(--rte-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
		width: 16rem;
	}

	.rte-color-grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.rte-color-swatch-btn {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.125rem;
		border: 1px solid color-mix(in srgb, var(--rte-border, #e2e8f0) 50%, transparent);
		cursor: pointer;
		padding: 0;
		transition: transform 0.15s;
	}

	.rte-color-swatch-btn:hover {
		transform: scale(1.1);
	}

	.rte-color-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.5rem;
		border-top: 1px solid var(--rte-border, #e2e8f0);
	}

	.rte-color-custom {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rte-color-custom-label {
		font-size: 0.625rem;
		text-transform: uppercase;
		font-weight: 700;
		color: var(--rte-muted-foreground, #64748b);
	}

	.rte-color-input {
		width: 1.5rem;
		height: 1.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	:global(.rte-color-clear-btn) {
		height: 1.75rem;
		padding: 0 0.5rem;
		font-size: 0.625rem;
	}
</style>
