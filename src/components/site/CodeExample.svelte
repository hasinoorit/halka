<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		language?: string;
		title?: string;
		children?: Snippet;
	}

	let { language = 'typescript', title, children }: Props = $props();

	let copied = $state(false);

	async function copyCode() {
		const pre = document.querySelector(`[data-code-id="${codeId}"] pre`);
		if (!pre?.textContent) return;
		await navigator.clipboard.writeText(pre.textContent);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	const codeId = `code-${Math.random().toString(36).slice(2)}`;
</script>

<div class="relative rounded-lg border border-border bg-muted/50" data-code-id={codeId}>
	<div class="flex items-center justify-between border-b border-border px-4 py-2">
		<span class="text-xs text-muted-foreground">{title ?? language}</span>
		<button
			type="button"
			class="text-xs text-muted-foreground hover:text-foreground"
			onclick={copyCode}
		>
			{copied ? 'Copied!' : 'Copy'}
		</button>
	</div>
	<pre class="overflow-x-auto p-4 text-sm"><code>{@render children?.()}</code></pre>
</div>
