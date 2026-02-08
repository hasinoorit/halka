<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		className?: string;
		children?: Snippet;
	}

	let { className = '', children }: Props = $props();
</script>

<div
	class={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
>
	{@render children?.()}
</div>
