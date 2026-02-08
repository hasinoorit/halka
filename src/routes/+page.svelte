<script lang="ts">
	import RichTextEditor from '../components/RichTextEditor.svelte';
	import Button from '../components/ui/button.svelte';

	let editorContent = $state(`
		<h2>Welcome to HalkaEditor</h2>
		<p>
			This is a <strong>modern</strong> rich text editor built with Svelte and TypeScript. It's
			lightweight, extensible, and designed for modern web applications.
		</p>

		<h3>Features</h3>
		<ul>
			<li>Rich text formatting (Bold, Italic, Underline)</li>
			<li>Headings and Blockquotes</li>
			<li>
				Lists (Ordered and Unordered)
				<ul>
					<li>Nested lists support (use Tab/Shift+Tab)</li>
				</ul>
			</li>
			<li>Links and Images</li>
			<li>Tables with advanced controls</li>
			<li>Custom text and background colors</li>
		</ul>

		<blockquote>"Simplicity is the ultimate sophistication." - Leonardo da Vinci</blockquote>

		<p>Try editing this content to see the editor in action!</p>
	`);
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
					onclick={() => window.open('https://github.com/hasinoor/halkaeditor', '_blank')}
					>GitHub</Button
				>
			</div>
		</div>

		<RichTextEditor bind:content={editorContent} />
	</div>
</div>
