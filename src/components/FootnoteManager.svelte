<script lang="ts">
	import { untrack } from 'svelte';
	import type { HalkaEditor } from '$lib/index.js';
	import type { FootnoteItem } from '$lib/plugins/footnote.js';
	import Button from './ui/button.svelte';
	import Dialog from './ui/dialog.svelte';
	import InlineEditor from './InlineEditor.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		editor: HalkaEditor | undefined;
		open: boolean;
		onClose: () => void;
	}

	let { editor, open = $bindable(), onClose }: Props = $props();

	let footnoteContent = $state('');
	let footnoteItems = $state<FootnoteItem[]>([]);
	let editingId = $state<string | null>(null);
	let editingContent = $state('');
	// Reload footnotes when the modal opens
	$effect(() => {
		if (open) {
			untrack(() => {
				loadFootnotes();
				editingId = null;
				editingContent = '';
			});
		}
	});

	function loadFootnotes() {
		if (editor) {
			footnoteItems = (editor.getState('footnote.items') as FootnoteItem[]) || [];
		}
	}

	function handleFootnoteSubmit() {
		if (footnoteContent && editor) {
			editor.execCommand('footnote.addItem', footnoteContent);
			footnoteContent = '';
			loadFootnotes();
		}
	}

	function deleteFootnote(id: string) {
		if (editor) {
			editor.execCommand('footnote.removeItem', id);
			loadFootnotes();
		}
	}

	function startEditing(item: FootnoteItem) {
		editingId = item.id;
		editingContent = item.content;
	}

	function cancelEditing() {
		editingId = null;
		editingContent = '';
	}

	function saveEdit() {
		if (editor && editingId) {
			editor.execCommand('footnote.editItem', { id: editingId, content: editingContent });
			editingId = null;
			editingContent = '';
			loadFootnotes();
		}
	}

	function moveFootnote(id: string, direction: 'up' | 'down') {
		if (!editor) return;

		const index = footnoteItems.findIndex((item) => item.id === id);
		if (index === -1) return;

		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex >= 0 && newIndex < footnoteItems.length) {
			editor.execCommand('footnote.moveItem', { id, index: newIndex });
			loadFootnotes();
		}
	}

	function insertCitation(id: string) {
		if (editor) {
			editor.execCommand('footnote.insertCitation', id);
			onClose();
		}
	}
</script>

<Dialog
	{open}
	{onClose}
	title="Manage Footnotes"
	description="Manage footnotes and insert citations."
	hideFooter={true}
>
	<div class="space-y-4">
		{#if footnoteItems.length > 0}
			<div class="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
				{#each footnoteItems as item, i}
					{#if editingId === item.id}
						<div transition:slide class="flex flex-col gap-2 w-full">
							<InlineEditor
								bind:value={editingContent}
								onSave={saveEdit}
								onCancel={cancelEditing}
								class="w-full bg-background"
							>
								{#snippet prependToolbar()}
									<span class="font-mono text-xs text-muted-foreground mr-1">[{i + 1}]</span>
								{/snippet}
							</InlineEditor>
						</div>
					{:else}
						<div transition:slide class="flex flex-col justify-between">
							<div class="text-sm truncate">
								<span class="font-mono text-xs text-muted-foreground mr-1">[{i + 1}]</span>
								{@html item.content}
							</div>
							<div class="flex justify-center gap-1 shrink-0">
								<Button
									size="sm"
									variant="ghost"
									className="h-7 w-7 px-0"
									onclick={() => moveFootnote(item.id, 'up')}
									disabled={i === 0}
									title="Move Up"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
									>
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 w-7 px-0"
									onclick={() => moveFootnote(item.id, 'down')}
									disabled={i === footnoteItems.length - 1}
									title="Move Down"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
									>
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 w-7 px-0"
									onclick={() => startEditing(item)}
									title="Edit"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path
											d="m15 5 4 4"
										/></svg
									>
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 w-7 px-0"
									onclick={() => insertCitation(item.id)}
									title="Insert Citation"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20"
										><!-- Icon from Fluent UI System Icons by Microsoft Corporation - https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE --><path
											fill="currentColor"
											d="M7.085 3A1.5 1.5 0 0 1 8.5 2h3a1.5 1.5 0 0 1 1.415 1H14.5A1.5 1.5 0 0 1 16 4.5v4.707a5.5 5.5 0 0 0-1-.185V4.5a.5.5 0 0 0-.5-.5h-1.585A1.5 1.5 0 0 1 11.5 5h-3a1.5 1.5 0 0 1-1.415-1H5.5a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h4.1q.276.538.657 1H5.5A1.5 1.5 0 0 1 4 16.5v-12A1.5 1.5 0 0 1 5.5 3zM8.5 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zM19 14.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-2.146-1.854a.5.5 0 0 0-.708 0L13.5 15.293l-.646-.647a.5.5 0 0 0-.708.708l1 1a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0 0-.708"
										/></svg
									>
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 w-7 px-0 text-destructive hover:text-destructive"
									onclick={() => deleteFootnote(item.id)}
									title="Delete"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
											d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
										/></svg
									>
								</Button>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
		{#if !editingId}
			<div transition:slide class="space-y-2 pt-2 border-t">
				<div class="flex gap-2">
					<InlineEditor
						bind:value={footnoteContent}
						onSave={handleFootnoteSubmit}
						class="w-full bg-background"
					>
						{#snippet prependToolbar()}
							<span class="font-mono text-xs text-muted-foreground mx-1">Add New</span>
						{/snippet}
					</InlineEditor>
				</div>
			</div>
		{/if}
	</div>
</Dialog>
