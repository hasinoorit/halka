<script lang="ts">
	import RichTextEditor from '../rich-text-editor/RichTextEditor.svelte';
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
			<li>Find and replace with match highlighting</li>
			<li>Clear formatting and clear styles as separate actions</li>
		</ul>

		<blockquote>"Simplicity is the ultimate sophistication." - Leonardo da Vinci</blockquote>

		<p>
			Try <span style="color: #e11d48; font-size: 20px"><strong><em>Find &amp; Replace</em></strong></span>
			(Cmd/Ctrl+F) to search for <strong>editor</strong> — the word appears several times in this
			demo. Use the clear-formatting button to remove bold/italic tags, or the eraser button to
			remove colors, font sizes, and other inline styles.
		</p>

		<p>The editor is easy to extend. The editor plugin system keeps the core small.</p>

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
				<svg
					class="h-10 w-10 text-foreground"
					viewBox="0 0 1024 1024"
					xmlns="http://www.w3.org/2000/svg"
					fill="currentColor"
					aria-hidden="true"
				>
					<rect x="301" y="183" width="121" height="644" rx="28" />
					<rect x="601" y="183" width="122" height="644" rx="28" />
					<g transform="translate(0 1024) scale(.1 -.1)">
						<path
							d="m8485 5778c-183-115-410-175-702-185l-173-6v44c0 95-45 139-143 139-71 0-110-20-133-68-16-34-17-34-65-29l-49 6v-500-500l51 2c49 3 52 1 64-27 23-54 59-74 136-74 94 0 127 28 136 112 7 73 10 73 233 59 277-17 462-68 639-176 32-19 65-35 72-35 8 0 48 32 89 71 237 224 513 397 769 484 129 43 107 45-411 43-424-3-482-5-478-18 21-70-18-130-85-130-47 0-66 12-151 90-55 51-75 63-139 85-16 5-10 10 31 26 31 12 77 43 115 78 35 32 79 66 97 75 82 42 173-37 132-115-11-19-2-19 477-19 293 0 483 4 478 9-6 5-52 25-103 45-262 101-513 263-725 470-88 86-93 87-162 44z"
						/>
						<path
							d="m4210 5175v-575h813c448 0 855 3 905 6l92 7v562 562l-46 7c-26 3-433 6-905 6h-859v-575z"
						/>
					</g>
				</svg>
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
		<RichTextEditor placeholder="Write something..." bind:content={editorContent} />

		<section class="rounded-lg border border-border bg-card p-5 text-card-foreground">
			<h2 class="text-lg font-semibold">Usage</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Open find &amp; replace from the toolbar or with Cmd/Ctrl+F. Use clear formatting to remove
				bold/italic tags, or clear styles to remove colors, fonts, and alignment.
			</p>
			<pre class="mt-3 overflow-x-auto rounded-md bg-muted p-4 text-sm"><code
					>import &#123; findReplacePlugin &#125; from 'halka/plugins/find-replace';

// Register the plugin
const editor = new HalkaEditor(element, &#123;
  plugins: [findReplacePlugin]
&#125;);

// Find &amp; replace
editor.execCommand('findReplace.open', &#123; query: 'editor' &#125;);
editor.execCommand('findReplace.findNext');
editor.execCommand('findReplace.replaceAll');

// Clear semantic formatting (strong, em, etc.)
editor.transforms.clearFormatting();

// Clear inline styles (color, font-size, text-align, etc.)
editor.clearStyles();</code
				></pre>
		</section>
	</div>
</div>
