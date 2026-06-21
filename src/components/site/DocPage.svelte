<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		tryHref?: string;
		children?: Snippet;
	}

	let { title, description, tryHref, children }: Props = $props();
</script>

<article class="space-y-6">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
		{#if description}
			<p class="text-muted-foreground">{description}</p>
		{/if}
		{#if tryHref}
			<p>
				<a href={tryHref} class="text-sm font-medium text-primary underline-offset-4 hover:underline">
					Try this feature →
				</a>
			</p>
		{/if}
	</header>
	<div class="prose prose-neutral dark:prose-invert max-w-none space-y-6">
		{@render children?.()}
	</div>
</article>
