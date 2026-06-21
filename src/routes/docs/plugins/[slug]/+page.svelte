<script lang="ts">
	import { page } from '$app/stores';
	import { PLUGINS } from '../../../../lib/site/content';
	import DocPage from '../../../../components/site/DocPage.svelte';
	import ApiTable from '../../../../components/site/ApiTable.svelte';
	import CodeExample from '../../../../components/site/CodeExample.svelte';

	const slug = $derived($page.params.slug);
	const plugin = $derived(PLUGINS.find((p) => p.slug === slug));
</script>

<svelte:head>
	<title>{plugin?.title ?? 'Plugin'} — Halka Editor</title>
</svelte:head>

{#if plugin}
	<DocPage title={plugin.title} description={plugin.description} tryHref="/demo">
		<section class="space-y-3">
			<h2 class="text-xl font-semibold">Import</h2>
			<CodeExample language="typescript">{plugin.importPath}</CodeExample>
		</section>

		{#if plugin.usageTips?.length}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold">Usage</h2>
				<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
					{#each plugin.usageTips as tip}
						<li>{tip}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if plugin.commands?.length}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold">Commands</h2>
				<ApiTable
					columns={[
						{ key: 'name', label: 'Command' },
						{ key: 'description', label: 'Description' }
					]}
					rows={plugin.commands.map((c) => ({ name: c.name, description: c.description }))}
				/>
			</section>
		{/if}

		{#if plugin.states?.length}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold">State</h2>
				<ApiTable
					columns={[
						{ key: 'name', label: 'State' },
						{ key: 'description', label: 'Description' }
					]}
					rows={plugin.states.map((s) => ({ name: s.name, description: s.description }))}
				/>
			</section>
		{/if}

		{#if plugin.shortcuts?.length}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold">Shortcuts</h2>
				<ApiTable
					columns={[
						{ key: 'name', label: 'Shortcut' },
						{ key: 'description', label: 'Action' }
					]}
					rows={plugin.shortcuts.map((s) => ({
						name: s.keys,
						description: s.action
					}))}
				/>
			</section>
		{/if}

		{#if plugin.example}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold">Example</h2>
				<CodeExample>{plugin.example}</CodeExample>
			</section>
		{/if}

		{#if plugin.notes}
			<section class="space-y-3">
				<h2 class="text-xl font-semibold">Notes</h2>
				<p class="text-sm text-muted-foreground">{plugin.notes}</p>
			</section>
		{/if}
	</DocPage>
{:else}
	<p>Plugin not found. <a href="/docs">Back to docs</a></p>
{/if}
