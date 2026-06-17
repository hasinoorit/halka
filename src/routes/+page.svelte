<script lang="ts">
	import RichTextEditor from '../rich-text-editor/RichTextEditor.svelte';
	import Button from '../components/ui/button.svelte';

	let editorContent = $state(`Hello World`);
</script>
<svelte:head>
	<title>Halka Editor</title>
</svelte:head>
<div class="min-h-screen bg-background p-8">
	<div class="container mx-auto max-w-5xl space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-2">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl"
				>
					H
				</div>
				<div>
					<h1 class="text-2xl font-bold tracking-tight">HalkaEditor</h1>
					<p class="text-sm text-muted-foreground">A lightweight, modern WYSIWYG editor</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button
					size="sm"
					onclick={() => window.open('https://github.com/hasinoorit/halka', '_blank')}
					>GitHub</Button
				>
			</div>
		</div>
		<form onsubmit={console.log} method="post">
			<RichTextEditor bind:content={editorContent} />
		</form>
		<div>
			<h2>Preview</h2>
			<div>{@html editorContent}</div>
		</div>
	</div>
</div>
