<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		language?: string;
		className?: string;
		children?: Snippet;
	}

	let { language = 'javascript', className = '', children }: Props = $props();
</script>

<div class={`relative rounded-md bg-muted p-4 font-mono text-sm ${className}`}>
	<div class="absolute right-2 top-2 text-xs text-muted-foreground">
		{language}
	</div>
	<pre>{@render children?.()}</pre>
</div>
