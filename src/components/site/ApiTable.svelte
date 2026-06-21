<script lang="ts">
	export type ApiRow = {
		name: string;
		type?: string;
		description: string;
	};

	interface Props {
		columns?: { key: keyof ApiRow; label: string }[];
		rows: ApiRow[];
	}

	let {
		columns = [
			{ key: 'name', label: 'Name' },
			{ key: 'type', label: 'Type' },
			{ key: 'description', label: 'Description' }
		],
		rows
	}: Props = $props();
</script>

<div class="overflow-x-auto rounded-lg border border-border">
	<table class="w-full text-sm">
		<thead class="border-b border-border bg-muted/50">
			<tr>
				{#each columns as col}
					<th class="px-4 py-2 text-left font-medium">{col.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row}
				<tr class="border-b border-border last:border-0">
					{#each columns as col}
						<td class="px-4 py-2 align-top">
							{#if col.key === 'name'}
								<code class="text-xs">{row.name}</code>
							{:else if col.key === 'type' && row.type}
								<code class="text-xs text-muted-foreground">{row.type}</code>
							{:else}
								{row.description}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
