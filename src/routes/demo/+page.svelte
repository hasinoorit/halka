<script lang="ts">
	import RichTextEditor from '../../rich-text-editor/RichTextEditor.svelte';
	import { DEMO_CONTENT } from '../../lib/site/demo-content.js';

	let editorContent = $state(DEMO_CONTENT);
</script>

<svelte:head>
	<title>Demo — Halka Editor</title>
</svelte:head>

<div class="space-y-4">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Interactive demo</h1>
		<p class="mt-1 text-muted-foreground">
			Full-featured editor with all plugins. Use the toolbar, keyboard shortcuts, and find &amp;
			replace (Cmd/Ctrl+F).
		</p>
	</div>
	<RichTextEditor placeholder="Write something..." bind:content={editorContent} />
</div>
