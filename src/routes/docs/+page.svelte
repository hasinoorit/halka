<script lang="ts">
	import { CORE_SECTIONS, PLUGINS } from '../../lib/site/content';
</script>

<svelte:head>
	<title>Documentation — Halka Editor</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Documentation</h1>
		<p class="mt-1 text-muted-foreground">
			Core editor APIs and plugin reference. Try everything interactively on
			<a href="/demo" class="text-primary underline-offset-4 hover:underline">/demo</a>.
		</p>
	</div>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Core</h2>
		<p class="text-sm text-muted-foreground">
			<a href="/docs/core" class="text-primary underline-offset-4 hover:underline">Core API</a>
			— formatting, styles, selection, and transforms ship with HalkaEditor.
		</p>
		<ul class="grid gap-2 sm:grid-cols-2">
			{#each CORE_SECTIONS as section}
				<li>
					<a
						href="/docs/core#{section.id}"
						class="block rounded-lg border border-border p-4 hover:bg-accent/50"
					>
						<span class="font-medium">{section.title}</span>
						<p class="mt-1 text-sm text-muted-foreground">{section.description}</p>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Svelte UI</h2>
		<p class="text-sm text-muted-foreground">
			<a href="/docs/svelte-ui" class="text-primary underline-offset-4 hover:underline"
				>Svelte UI components</a
			>
			— RichTextEditor and InlineEditor (in-repo demo, not npm)
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Plugins</h2>
		<ul class="grid gap-2 sm:grid-cols-2">
			{#each PLUGINS as plugin}
				<li>
					<a
						href="/docs/plugins/{plugin.slug}"
						class="block rounded-lg border border-border p-4 hover:bg-accent/50"
					>
						<span class="font-medium">{plugin.title}</span>
						<p class="mt-1 text-sm text-muted-foreground">{plugin.description}</p>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
