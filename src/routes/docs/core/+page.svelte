<script lang="ts">
	import DocPage from '../../../components/site/DocPage.svelte';
	import ApiTable from '../../../components/site/ApiTable.svelte';
	import CodeExample from '../../../components/site/CodeExample.svelte';
</script>

<svelte:head>
	<title>Core API — Halka Editor</title>
</svelte:head>

<DocPage
	title="Core API"
	description="HalkaEditor is the headless editing kernel. Formatting, styles, and selection ship in core; lists, tables, and other features require plugins."
	tryHref="/demo"
>
	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Constructor</h2>
		<CodeExample>
new HalkaEditor(root: HTMLElement, options?: &#123;
  plugins?: HalkaPlugin[];
  shortcuts?: boolean;  // default true
  inline?: boolean;     // inline mode (no block wrapper)
&#125;)
		</CodeExample>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Content</h2>
		<ApiTable
			rows={[
				{ name: 'getHTML()', type: 'string', description: 'Current inner HTML' },
				{ name: 'setHTML(html)', description: 'Replace all content' },
				{ name: 'insertHTML(html)', description: 'Insert at selection' },
				{ name: 'insertText(text)', description: 'Insert plain text' }
			]}
		/>
	</section>

	<section id="formatting" class="scroll-mt-20 space-y-3">
		<h2 class="text-xl font-semibold">Text formatting</h2>
		<p class="text-sm text-muted-foreground">
			Apply semantic inline formatting and block types. Clear formatting removes tags; it does not
			remove inline styles.
		</p>
		<ApiTable
			rows={[
				{
					name: 'toggleInlineFormat(format)',
					description: 'bold, italic, underline, code, strikethrough, sub, sup'
				},
				{ name: 'toggleBlockFormat(format)', description: 'h1, h2, h3, blockquote, pre, p' },
				{
					name: 'transforms.clearFormatting()',
					description: 'Remove semantic tags (strong, em, u, code, etc.)'
				},
				{ name: 'hasFormat(format)', type: 'boolean', description: 'Check active format' }
			]}
		/>
		<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
			<li>Collapsed cursor inside a format + toggle removes the whole wrapping element</li>
			<li>Collapsed cursor outside a format sets a pending format — next typed character is wrapped</li>
			<li>Built-in shortcuts: Mod+B (bold), Mod+I (italic), Mod+U (underline)</li>
		</ul>
		<CodeExample>
editor.toggleInlineFormat('bold');
editor.toggleBlockFormat('h2');
editor.transforms.clearFormatting();
		</CodeExample>
	</section>

	<section id="styles" class="scroll-mt-20 space-y-3">
		<h2 class="text-xl font-semibold">Inline &amp; block styles</h2>
		<p class="text-sm text-muted-foreground">
			Colors, font family, font size, and text alignment via CSS. clearStyles() removes style
			attributes only.
		</p>
		<ApiTable
			rows={[
				{ name: 'setInlineStyle(prop, value?)', description: 'Apply or remove inline CSS on selection' },
				{ name: 'setBlockStyle(prop, value?)', description: 'Apply or remove block CSS on current block' },
				{ name: 'clearStyles()', description: 'Remove style attributes in scope; unwrap empty spans' },
				{ name: 'getStyle(property)', description: 'Computed style at selection' }
			]}
		/>
		<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
			<li>If a span already wraps the selection, inline style is updated in place</li>
			<li>Removing the only style on a span unwraps it entirely</li>
		</ul>
		<CodeExample>
editor.setInlineStyle('color', '#e11d48');
editor.setBlockStyle('text-align', 'center');
editor.clearStyles();
		</CodeExample>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">clearStyles vs clearFormatting</h2>
		<p class="text-sm text-muted-foreground">
			<strong>clearStyles()</strong> — collapsed: current block; range: selection root. Finds all
			<code>[style]</code> elements, removes attributes, unwraps empty spans, then normalizes.
		</p>
		<p class="text-sm text-muted-foreground">
			<strong>clearFormatting()</strong> — removes semantic tags (strong, em, u, code, etc.) without
			touching style attributes.
		</p>
	</section>

	<section id="selection" class="scroll-mt-20 space-y-3">
		<h2 class="text-xl font-semibold">Selection</h2>
		<p class="text-sm text-muted-foreground">
			Access via <code>editor.selection</code>. Selection is saved on blur and restored before
			operations automatically.
		</p>
		<ApiTable
			rows={[
				{ name: 'getRange() / setSelection(range)', description: 'Get or set DOM Range' },
				{ name: 'selection.preserveSelection(cb)', description: 'Mutate DOM, restore selection' },
				{
					name: 'selection.isAtBlockStart() / isAtBlockEnd()',
					type: 'boolean',
					description: 'Block boundaries'
				}
			]}
		/>
	</section>

	<section id="block-delete" class="scroll-mt-20 space-y-3">
		<h2 class="text-xl font-semibold">Block delete</h2>
		<p class="text-sm text-muted-foreground">
			When the cursor is at a block boundary, Backspace and Delete merge or remove blocks instead of
			only deleting characters. This is built into the core input handler — no API to call.
		</p>
		<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
			<li>Backspace at the start of a block merges with the previous block</li>
			<li>Delete at the end of a block merges with the next block</li>
			<li>Empty blocks are removed when appropriate</li>
			<li>Disabled in inline mode (<code>inline: true</code>)</li>
		</ul>
	</section>

	<section id="inline-mode" class="scroll-mt-20 space-y-3">
		<h2 class="text-xl font-semibold">Inline mode</h2>
		<p class="text-sm text-muted-foreground">
			Pass <code>inline: true</code> for compact single-line-style editing (footnotes, dialog fields).
			The editor root has no block wrapper; block formatting and block delete are disabled.
		</p>
		<CodeExample>
const editor = new HalkaEditor(root, &#123; inline: true &#125;);
		</CodeExample>
		<p class="text-sm text-muted-foreground">
			See <a href="/docs/svelte-ui" class="text-primary underline">Svelte UI</a> for the in-repo
			InlineEditor component built on this mode.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Query &amp; transforms</h2>
		<ApiTable
			rows={[
				{ name: 'query.isActive(tag)', type: 'boolean', description: 'Format active at cursor' },
				{ name: 'query.getCurrentBlock()', description: 'Current block element' },
				{ name: 'query.findClosest(tag)', description: 'Nearest ancestor with tag' },
				{ name: 'transforms.toggleMark(tag)', description: 'Toggle inline wrapper' },
				{ name: 'transforms.wrap / unwrap(tag)', description: 'Wrap or unwrap selection' }
			]}
		/>
	</section>

	<section id="shortcuts" class="scroll-mt-20 space-y-3">
		<h2 class="text-xl font-semibold">Built-in shortcuts</h2>
		<p class="text-sm text-muted-foreground">
			Enabled by default (<code>shortcuts: true</code>). Plugin shortcuts are documented on each
			plugin page.
		</p>
		<ApiTable
			columns={[
				{ key: 'name', label: 'Shortcut' },
				{ key: 'description', label: 'Action' }
			]}
			rows={[
				{ name: 'Mod+B', description: 'Toggle bold' },
				{ name: 'Mod+I', description: 'Toggle italic' },
				{ name: 'Mod+U', description: 'Toggle underline' }
			]}
		/>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Transactions &amp; events</h2>
		<CodeExample>
editor.runTransaction(() => &#123;
  // DOM mutations — auto-normalizes and emits change
&#125;);

editor.on('change', (html) => &#123; /* save */ &#125;);
editor.on('formatChange', () => &#123; /* toolbar */ &#125;);
		</CodeExample>
	</section>
</DocPage>
