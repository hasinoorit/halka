<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { HalkaEditor } from '$lib/core/editor.js';
	import { listPlugin } from '$lib/plugins/list.js';
	import { tablePlugin } from '$lib/plugins/table.js';
	import { findReplacePlugin } from '$lib/plugins/find-replace.js';
	import FindReplace from '../rich-text-editor/FindReplace.svelte';
	import '../rich-text-editor/styles.css';
	import Button from './ui/button.svelte';

	let editor: HalkaEditor | null = $state(null);
	let editorElement: HTMLDivElement | null = $state(null);
	let showFindReplace = $state(false);
	let content = $state(`
		<h2>Welcome to HalkaEditor</h2>
		<p>This is a <strong>modern</strong> rich text editor with:</p>
		<ul>
			<li>Text formatting</li>
			<li>Lists and tables</li>
			<li>Custom styling</li>
			<li>And much more!</li>
		</ul>
		<p>Try editing this content to see the editor in action!</p>
	`);

	onMount(() => {
		if (editorElement) {
			editor = new HalkaEditor(editorElement, {
				plugins: [listPlugin, tablePlugin, findReplacePlugin]
			});
			editor.setHTML(content);
		}
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	function formatBold() {
		editor?.transforms.toggleMark('STRONG');
	}

	function formatItalic() {
		editor?.transforms.toggleMark('EM');
	}

	function formatColor(color: string) {
		editor?.setInlineStyle('color', color);
	}

	function formatBackground(color: string) {
		editor?.setInlineStyle('background-color', color);
	}

	function insertList() {
		editor?.execCommand('list.toggleUnordered');
	}

	function openFindReplace() {
		editor?.execCommand('findReplace.open');
		showFindReplace = true;
	}

	function closeFindReplace() {
		editor?.execCommand('findReplace.close');
		showFindReplace = false;
	}

	function clearFormatting() {
		editor?.transforms.clearFormatting();
	}

	function clearStyles() {
		editor?.clearStyles();
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap gap-2 p-4 border-b">
		<Button size="sm" onclick={formatBold}>
			<strong>B</strong>
		</Button>

		<Button size="sm" onclick={formatItalic}>
			<em>I</em>
		</Button>

		<Button size="sm" onclick={() => formatColor('#ff0000')}>
			<span class="text-red-500">A</span>
		</Button>

		<Button size="sm" onclick={() => formatBackground('#ffff00')}>
			<span class="bg-yellow-200 px-1">BG</span>
		</Button>

		<Button size="sm" onclick={insertList}>• List</Button>

		<Button size="sm" onclick={openFindReplace} title="Find and Replace (Ctrl+F)">
			Find
		</Button>

		<Button size="sm" onclick={clearFormatting} title="Clear formatting">
			<span class="line-through">T</span>
		</Button>

		<Button size="sm" onclick={clearStyles} title="Clear styles">
			Eraser
		</Button>
	</div>

	<div
		bind:this={editorElement}
		class="halka-editor min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		style="resize: vertical; overflow: auto"
	></div>

	<FindReplace {editor} bind:open={showFindReplace} onClose={closeFindReplace} />

	<div class="text-xs text-muted-foreground">
		Tip: Select text and use the toolbar buttons to format content. Press Cmd/Ctrl+F to find text, or
		use Clear formatting to remove styles from a selection or block.
	</div>
</div>
