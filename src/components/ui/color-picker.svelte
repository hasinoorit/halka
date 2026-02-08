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
		// Grayscale
		'#000000',
		'#434343',
		'#666666',
		'#999999',
		'#b7b7b7',
		'#cccccc',
		'#d9d9d9',
		'#efefef',
		'#f3f3f3',
		'#ffffff',
		// Red/Pink
		'#980000',
		'#ff0000',
		'#ff9900',
		'#ffff00',
		'#00ff00',
		'#00ffff',
		'#4a86e8',
		'#0000ff',
		'#9900ff',
		'#ff00ff',
		// Light colors
		'#e6b8af',
		'#f4cccc',
		'#fce5cd',
		'#fff2cc',
		'#d9ead3',
		'#d0e0e3',
		'#c9daf8',
		'#cfe2f3',
		'#d9d2e9',
		'#ead1dc',
		// Medium colors
		'#dd7e6b',
		'#ea9999',
		'#f9cb9c',
		'#ffe599',
		'#b6d7a8',
		'#a2c4c9',
		'#a4c2f4',
		'#9fc5e8',
		'#b4a7d6',
		'#d5a6bd',
		// Dark colors
		'#cc4125',
		'#e06666',
		'#f6b26b',
		'#ffd966',
		'#93c47d',
		'#76a5af',
		'#6d9eeb',
		'#6fa8dc',
		'#8e7cc3',
		'#c27ba0',
		// Darker colors
		'#a61c00',
		'#cc0000',
		'#e69138',
		'#f1c232',
		'#6aa84f',
		'#45818e',
		'#3c78d8',
		'#3d85c6',
		'#674ea7',
		'#a64d79',
		// Even darker
		'#85200c',
		'#990000',
		'#b45f06',
		'#bf9000',
		'#38761d',
		'#134f5c',
		'#1155cc',
		'#0b5394',
		'#351c75',
		'#741b47',
		// Darkest
		'#5b0f00',
		'#660000',
		'#783f04',
		'#7f6000',
		'#274e13',
		'#0c343d',
		'#1c4587',
		'#073763',
		'#20124d',
		'#4c1130'
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

<div class="relative inline-block" bind:this={container}>
	<Button
		variant="outline"
		size="sm"
		className={`flex flex-col items-center gap-1 px-2 h-8 ${className}`}
		onclick={toggle}
	>
		{#if children}
			{@render children?.()}
		{:else}
			<div class="w-4 h-4 rounded-sm border border-border" style="background-color: {value}"></div>
		{/if}
	</Button>

	{#if isOpen}
		<div
			class="absolute left-0 mt-2 z-50 p-3 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl w-64 animate-in fade-in zoom-in duration-200"
		>
			<div class="grid grid-cols-10 gap-1 mb-3">
				{#each presets as color}
					<button
						class="w-5 h-5 rounded-sm border border-border/50 hover:scale-110 transition-transform"
						style="background-color: {color}"
						title={color}
						onclick={() => select(color)}
					></button>
				{/each}
			</div>

			<div class="flex items-center justify-between pt-2 border-t border-border">
				<div class="flex items-center gap-2">
					<span class="text-[10px] uppercase font-bold text-muted-foreground">Custom</span>
					<input
						type="color"
						{value}
						class="w-6 h-6 bg-transparent border-none cursor-pointer"
						oninput={(e) => select(e.currentTarget.value)}
					/>
				</div>
				<Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onclick={clear}>
					CLEAR
				</Button>
			</div>
		</div>
	{/if}
</div>
