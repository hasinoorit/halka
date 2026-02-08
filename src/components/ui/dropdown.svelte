<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	interface DropdownItem {
		label: string;
		value?: string;
		icon?: any;
		onclick?: () => void;
		variant?: 'default' | 'destructive';
	}

	interface Props {
		trigger: Snippet;
		items?: DropdownItem[];
		children?: Snippet; // Alternative to items for custom content
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

<div class="relative inline-block {className}" bind:this={container}>
	<div onclick={toggle} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && toggle()}>
		{@render trigger()}
	</div>

	{#if isOpen}
		<div
			class="absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none
            {align === 'left' ? 'left-0' : 'right-0'}"
			transition:scale={{ duration: 100, start: 0.95 }}
		>
			{#if items}
				<div class="flex flex-col">
					{#each items as item}
						<button
							class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50
                            {item.variant === 'destructive'
								? 'text-destructive hover:bg-destructive hover:text-destructive-foreground'
								: ''}"
							onclick={() => {
								item.onclick?.();
								close();
							}}
						>
							{#if item.icon}
								<span class="mr-2 flex h-3.5 w-3.5 items-center justify-center">
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
