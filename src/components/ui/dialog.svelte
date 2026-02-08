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
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="presentation"
	>
		<div
			class="bg-background border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden relative"
			transition:scale={{ duration: 150, start: 0.95 }}
			role="dialog"
			aria-modal="true"
		>
			{#if title || description}
				<div class="p-6 pb-0 relative">
					{#if title}
						<h3 class="text-lg font-semibold leading-none tracking-tight">{title}</h3>
					{/if}
					{#if description}
						<p class="text-sm text-muted-foreground mt-2">{description}</p>
					{/if}
					<button
						class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
						onclick={onClose}
					>
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
							class="h-4 w-4"
						>
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
						<span class="sr-only">Close</span>
					</button>
				</div>
			{/if}

			<div class="p-6">
				{@render children?.()}
			</div>

			{#if footer && !hideFooter}
				<div class="flex items-center justify-end p-6 pt-0 gap-2">
					{@render footer()}
				</div>
			{:else if !hideFooter}
				<div class="flex items-center justify-end p-6 pt-0 gap-2">
					<Button variant="outline" onclick={onClose}>Cancel</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
