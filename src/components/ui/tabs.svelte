<script lang="ts" module>
	export interface TabsContext {
		value: string;
		setTab: (value: string) => void;
	}
</script>

<script lang="ts">
	import { setContext, type Snippet } from 'svelte';

	interface Props {
		value: string;
		className?: string;
		children?: Snippet;
	}

	let { value = $bindable(), className = '', children }: Props = $props();

	setContext('tabs', {
		get value() {
			return value;
		},
		setTab: (newValue: string) => {
			value = newValue;
		}
	});
</script>

<div class={className}>
	{@render children?.()}
</div>
