<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		className?: string;
		children?: Snippet;
	}

	let { className = '', children, ...rest }: Props = $props();
</script>

<div class={`p-6 pt-0 ${className}`} {...rest}>
	{@render children?.()}
</div>
