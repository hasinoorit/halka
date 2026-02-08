<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { TabsContext } from './tabs.svelte';

	interface Props {
		value: string;
		className?: string;
		children?: Snippet;
	}

	let { value, className = '', children }: Props = $props();

	const tabs = getContext<TabsContext>('tabs');
</script>

{#if tabs.value === value}
	<div
		class={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
		data-state={tabs.value === value ? 'active' : 'inactive'}
	>
		{@render children?.()}
	</div>
{/if}
