<script lang="ts">
	import DocPage from '../../../components/site/DocPage.svelte';
	import ApiTable from '../../../components/site/ApiTable.svelte';
	import CodeExample from '../../../components/site/CodeExample.svelte';

	const richTextExample = `import RichTextEditor from '../rich-text-editor/RichTextEditor.svelte';
import '../rich-text-editor/styles.css';

<RichTextEditor bind:content={html} placeholder="Write…" />`;

	const inlineEditorExample = `import InlineEditor from '../rich-text-editor/InlineEditor.svelte';

<InlineEditor bind:value={html} onSave={save} onCancel={cancel} />`;
</script>

<svelte:head>
	<title>Svelte UI — Halka Editor</title>
</svelte:head>

<DocPage
	title="Svelte UI components"
	description="Optional UI built for the demo site. Not exported from the npm package — copy from src/rich-text-editor/ or build your own toolbar."
	tryHref="/demo"
>
	<div class="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
		<strong>In-repo only.</strong> The published <code>halka</code> package is headless. These
		components live in the repository for reference and the live demo.
	</div>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">RichTextEditor</h2>
		<p class="text-sm text-muted-foreground">
			Full editor with toolbar, modals, find-replace bar, and footnote manager. Wires all plugins.
		</p>
		<ApiTable
			rows={[
				{ name: 'content', type: 'string (bindable)', description: 'HTML content' },
				{ name: 'placeholder', type: 'string', description: 'Empty state placeholder' },
				{ name: 'onChange', type: '(html) => void', description: 'Content change callback' },
				{ name: 'class', type: 'string', description: 'Wrapper class' }
			]}
		/>
		<CodeExample>{richTextExample}</CodeExample>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">InlineEditor</h2>
		<p class="text-sm text-muted-foreground">
			Compact single-line-style editor for footnotes and dialogs. Uses HalkaEditor with
			<a href="/docs/core#inline-mode" class="text-primary underline">inline mode</a>.
		</p>
		<ApiTable
			rows={[
				{ name: 'value', type: 'string (bindable)', description: 'HTML content' },
				{ name: 'onSave', type: '() => void', description: 'Called on Enter / save button' },
				{ name: 'onCancel', type: '() => void', description: 'Optional cancel handler' },
				{ name: 'prependToolbar', type: 'Snippet', description: 'Extra toolbar buttons' }
			]}
		/>
		<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
			<li>Used inside FootnoteManager for editing footnote bodies</li>
			<li>Enter saves, Escape cancels — configure via onSave/onCancel</li>
			<li>Not published to npm; copy from repo or use headless API with inline: true</li>
		</ul>
		<CodeExample>{inlineEditorExample}</CodeExample>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Composition</h2>
		<p class="text-sm text-muted-foreground">RichTextEditor is built from:</p>
		<ul class="list-disc pl-5 text-sm text-muted-foreground">
			<li><strong>Toolbar.svelte</strong> — formatting, lists, table menu, find, clear actions</li>
			<li><strong>FindReplace.svelte</strong> — find/replace panel bound to findReplacePlugin state</li>
			<li><strong>FootnoteManager.svelte</strong> — footnote list and InlineEditor instances</li>
			<li>
				<strong>Image modal</strong> — insert/edit dialog with layout (inline in text / block on own
				line), alt text, and width/height/max-width sizing
			</li>
			<li><strong>styles.css</strong> — editor chrome, toolbar, find highlight (::highlight)</li>
		</ul>
	</section>
</DocPage>
