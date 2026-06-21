<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { scale } from 'svelte/transition';

	interface DropdownItem {
		label: string;
		value?: string;
		icon?: Snippet;
		onclick?: () => void;
		variant?: 'default' | 'destructive';
		disabled?: boolean;
	}

	interface Props {
		trigger: Snippet;
		items?: DropdownItem[];
		children?: Snippet;
		className?: string;
		align?: 'left' | 'right';
		onOpen?: () => void;
	}

	let { trigger, items, children, className = '', align = 'left', onOpen }: Props = $props();

	let isOpen = $state(false);
	let container = $state<HTMLDivElement>();

	function toggle() {
		isOpen = !isOpen;
		if (isOpen && onOpen) onOpen();
	}

	function close() {
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

<div class="rte-dropdown {className}" bind:this={container}>
	<div
		onclick={toggle}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && toggle()}
	>
		{@render trigger()}
	</div>

	{#if isOpen}
		<div
			class="rte-dropdown-menu rte-dropdown-menu--{align}"
			transition:scale={{ duration: 100, start: 0.95 }}
		>
			{#if items}
				<div class="rte-dropdown-items">
					{#each items as item}
						<button
							class="rte-dropdown-item"
							class:rte-dropdown-item--destructive={item.variant === 'destructive'}
							class:rte-dropdown-item--disabled={item.disabled}
							disabled={item.disabled}
							onclick={() => {
								if (item.disabled) return;
								item.onclick?.();
								close();
							}}
							type="button"
						>
							{#if item.icon}
								<span class="rte-dropdown-icon">
									{@render item.icon()}
								</span>
							{/if}
							{item.label}
						</button>
					{/each}
				</div>
			{/if}

			{#if children}
				{@render children()}
			{/if}
		</div>
	{/if}
</div>

<style>
	.rte-dropdown {
		position: relative;
		display: inline-block;
	}

	.rte-dropdown-menu {
		position: absolute;
		z-index: 50;
		margin-top: 0.5rem;
		min-width: 8rem;
		overflow: hidden;
		border-radius: calc(var(--rte-radius, 0.5rem) - 2px);
		border: 1px solid var(--rte-border, #e2e8f0);
		background: var(--rte-popover, #fff);
		color: var(--rte-popover-foreground, #0f172a);
		padding: 0.25rem;
		box-shadow: var(--rte-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
		outline: none;
	}

	.rte-dropdown-menu--left {
		left: 0;
	}

	.rte-dropdown-menu--right {
		right: 0;
	}

	.rte-dropdown-items {
		display: flex;
		flex-direction: column;
	}

	.rte-dropdown-item {
		position: relative;
		display: flex;
		cursor: pointer;
		user-select: none;
		align-items: center;
		border: none;
		background: transparent;
		border-radius: 0.25rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.875rem;
		color: inherit;
		font-family: inherit;
		width: 100%;
		text-align: left;
		transition: background-color 0.15s, color 0.15s;
	}

	.rte-dropdown-item:hover {
		background: var(--rte-accent, #f1f5f9);
		color: var(--rte-accent-foreground, #0f172a);
	}

	.rte-dropdown-item--disabled,
	.rte-dropdown-item--disabled:hover {
		cursor: not-allowed;
		opacity: 0.5;
		background: transparent;
	}

	.rte-dropdown-item--destructive {
		color: var(--rte-destructive, #ef4444);
	}

	.rte-dropdown-item--destructive:hover {
		background: var(--rte-destructive, #ef4444);
		color: var(--rte-destructive-foreground, #f8fafc);
	}

	.rte-dropdown-icon {
		margin-right: 0.5rem;
		display: flex;
		height: 0.875rem;
		width: 0.875rem;
		align-items: center;
		justify-content: center;
	}
</style>
