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

<button
	class={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className}`}
	data-state={tabs.value === value ? 'active' : 'inactive'}
	onclick={() => tabs.setTab(value)}
>
	{@render children?.()}
</button>
