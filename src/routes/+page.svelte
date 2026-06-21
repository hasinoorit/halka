<script lang="ts">
	import Button from '../components/ui/button.svelte';
	import CodeExample from '../components/site/CodeExample.svelte';
</script>

<svelte:head>
	<title>Halka — Headless Rich Text Editor</title>
</svelte:head>

<div class="space-y-12">
	<section class="space-y-4 text-center">
		<h1 class="text-4xl font-bold tracking-tight md:text-5xl">Halka Editor</h1>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
			A headless, framework-agnostic rich text editor kernel for the web. Build your own toolbar;
			Halka handles the DOM, selection, and plugins.
		</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button onclick={() => (window.location.href = '/demo')}>Try the demo</Button>
			<Button variant="outline" onclick={() => (window.location.href = '/docs')}>Read the docs</Button>
		</div>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Quick start</h2>
		<CodeExample title="Install &amp; setup">
pnpm add halka

import &#123; HalkaEditor &#125; from 'halka';
import &#123; historyPlugin &#125; from 'halka/plugins/history';
import &#123; pastePlugin &#125; from 'halka/plugins/paste';

const editor = new HalkaEditor(document.getElementById('editor')!, &#123;
  plugins: [historyPlugin, pastePlugin]
&#125;);
editor.setHTML('&lt;p&gt;Hello world&lt;/p&gt;');
		</CodeExample>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">Features</h2>
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{ title: 'Headless core', desc: 'Commands, queries, transforms, selection' },
				{ title: '10 plugins', desc: 'History, lists, tables, footnotes, find-replace…' },
				{ title: 'Clean DOM', desc: 'Pending formats without zero-width spaces' },
				{ title: 'Schema-aware', desc: 'Block, inline, and void categorization' },
				{ title: 'Svelte UI', desc: 'Optional RichTextEditor in this repo' },
				{ title: 'TypeScript', desc: 'Typed commands, state, and events' }
			] as f}
				<li class="rounded-lg border border-border p-4">
					<h3 class="font-medium">{f.title}</h3>
					<p class="mt-1 text-sm text-muted-foreground">{f.desc}</p>
				</li>
			{/each}
		</ul>
		<p class="text-sm text-muted-foreground">
			<a href="/docs" class="underline hover:text-foreground">Read the full documentation →</a>
		</p>
	</section>
</div>
