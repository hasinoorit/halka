<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		className?: string;
		children?: Snippet;
	}

	let { className = '', children, ...rest }: Props = $props();
</script>

<div class={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...rest}>
	{@render children?.()}
</div>
