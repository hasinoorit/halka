<script lang="ts">
	import { type Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Button from './button.svelte';

	interface Props {
		open: boolean;
		title?: string;
		description?: string;
		children?: Snippet;
		footer?: Snippet;
		hideFooter?: boolean;
		onClose: () => void;
	}

	let { open, title, description, hideFooter = false, children, footer, onClose }: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="rte-dialog-overlay"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="presentation"
	>
		<div
			class="rte-dialog"
			transition:scale={{ duration: 150, start: 0.95 }}
			role="dialog"
			aria-modal="true"
		>
			{#if title || description}
				<div class="rte-dialog-header">
					{#if title}
						<h3 class="rte-dialog-title">{title}</h3>
					{/if}
					{#if description}
						<p class="rte-dialog-description">{description}</p>
					{/if}
					<button class="rte-dialog-close" onclick={onClose} type="button">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
						<span class="rte-sr-only">Close</span>
					</button>
				</div>
			{/if}

			<div class="rte-dialog-body">
				{@render children?.()}
			</div>

			{#if footer && !hideFooter}
				<div class="rte-dialog-footer">
					{@render footer()}
				</div>
			{:else if !hideFooter}
				<div class="rte-dialog-footer">
					<Button variant="outline" onclick={onClose}>Cancel</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.rte-dialog-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgb(0 0 0 / 0.5);
		backdrop-filter: blur(4px);
	}

	.rte-dialog {
		background: var(--rte-background, #fff);
		border: 1px solid var(--rte-border, #e2e8f0);
		border-radius: var(--rte-radius, 0.5rem);
		box-shadow: var(--rte-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
		width: 100%;
		max-width: 28rem;
		overflow: hidden;
		position: relative;
		color: var(--rte-foreground, #0f172a);
	}

	.rte-dialog-header {
		padding: 1.5rem 1.5rem 0;
		position: relative;
	}

	.rte-dialog-title {
		font-size: 1.125rem;
		font-weight: 600;
		line-height: 1;
		margin: 0;
	}

	.rte-dialog-description {
		font-size: 0.875rem;
		color: var(--rte-muted-foreground, #64748b);
		margin: 0.5rem 0 0;
	}

	.rte-dialog-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		border: none;
		background: transparent;
		border-radius: 0.25rem;
		opacity: 0.7;
		cursor: pointer;
		padding: 0.25rem;
		color: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rte-dialog-close:hover {
		opacity: 1;
	}

	.rte-dialog-close:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--rte-ring, #94a3b8);
	}

	.rte-dialog-body {
		padding: 1.5rem;
	}

	.rte-dialog-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 0 1.5rem 1.5rem;
		gap: 0.5rem;
	}
</style>
