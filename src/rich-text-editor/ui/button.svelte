<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'default' | 'sm' | 'lg' | 'icon';
		className?: string;
		children?: Snippet;
		type?: 'button' | 'submit' | 'reset';
	}

	let {
		variant = 'default',
		size = 'default',
		className = '',
		children,
		type = 'button',
		...rest
	}: Props = $props();
</script>

<button
	class="rte-btn rte-btn--{variant} rte-btn--{size} {className}"
	{...rest}
	{type}
>
	{@render children?.()}
</button>

<style>
	.rte-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
		border-radius: calc(var(--rte-radius, 0.5rem) - 2px);
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s, color 0.15s;
		background: transparent;
		color: inherit;
		font-family: inherit;
	}

	.rte-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--rte-background, #fff), 0 0 0 4px var(--rte-ring, #94a3b8);
	}

	.rte-btn:disabled {
		pointer-events: none;
		opacity: 0.5;
	}

	.rte-btn--default {
		background: var(--rte-primary, #0f172a);
		color: var(--rte-primary-foreground, #f8fafc);
	}

	.rte-btn--default:hover:not(:disabled) {
		opacity: 0.9;
	}

	.rte-btn--destructive {
		background: var(--rte-destructive, #ef4444);
		color: var(--rte-destructive-foreground, #f8fafc);
	}

	.rte-btn--destructive:hover:not(:disabled) {
		opacity: 0.9;
	}

	.rte-btn--outline {
		border: 1px solid var(--rte-input, #e2e8f0);
		background: var(--rte-background, #fff);
		color: var(--rte-foreground, #0f172a);
	}

	.rte-btn--outline:hover:not(:disabled) {
		background: var(--rte-accent, #f1f5f9);
		color: var(--rte-accent-foreground, #0f172a);
	}

	.rte-btn--secondary {
		background: var(--rte-secondary, #f1f5f9);
		color: var(--rte-secondary-foreground, #0f172a);
	}

	.rte-btn--secondary:hover:not(:disabled) {
		opacity: 0.8;
	}

	.rte-btn--ghost:hover:not(:disabled) {
		background: var(--rte-accent, #f1f5f9);
		color: var(--rte-accent-foreground, #0f172a);
	}

	.rte-btn--link {
		color: var(--rte-primary, #0f172a);
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	.rte-btn--default,
	.rte-btn--outline,
	.rte-btn--secondary {
		height: 2.5rem;
		padding: 0.5rem 1rem;
	}

	.rte-btn--sm {
		height: 2.25rem;
		padding: 0 0.75rem;
		font-size: 0.875rem;
	}

	.rte-btn--lg {
		height: 2.75rem;
		padding: 0 2rem;
	}

	.rte-btn--icon {
		height: 2rem;
		width: 2rem;
		padding: 0;
	}

	:global(.rte-btn--icon-sm) {
		height: 1.75rem;
		width: 1.75rem;
		padding: 0;
	}

	:global(.rte-btn--destructive-text) {
		color: var(--rte-destructive, #ef4444);
	}

	:global(.rte-btn--destructive-text:hover:not(:disabled)) {
		background: color-mix(in srgb, var(--rte-destructive, #ef4444) 10%, transparent);
	}

	:global(.rte-btn--success-text) {
		color: #16a34a;
	}

	:global(.rte-btn--success-text:hover:not(:disabled)) {
		background: #dcfce7;
	}

	:global(.rte-btn--table-trigger) {
		height: 2rem;
		gap: 0.25rem;
		padding: 0 0.5rem;
		margin-left: 0.25rem;
	}
</style>
