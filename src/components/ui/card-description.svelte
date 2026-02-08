<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLParagraphElement> {
		className?: string;
		children?: Snippet;
	}

	let { className = '', children, ...rest }: Props = $props();
</script>

<p class={`text-sm text-muted-foreground ${className}`} {...rest}>
	{@render children?.()}
</p>
