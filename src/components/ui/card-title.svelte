<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLHeadingElement> {
		className?: string;
		children?: Snippet;
	}

	let { className = '', children, ...rest }: Props = $props();
</script>

<h3 class={`font-semibold leading-none tracking-tight ${className}`} {...rest}>
	{@render children?.()}
</h3>
