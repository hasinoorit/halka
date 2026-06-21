<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { HalkaEditor } from 'halka';
	import { linkPlugin } from 'halka/plugins/link';
	import { placeholderPlugin } from 'halka/plugins/placeholder';
	import Button from './ui/button.svelte';
	import ColorPicker from './ui/color-picker.svelte';

	interface Props {
		value: string;
		onSave: () => void;
		onCancel?: () => void;
		class?: string;
		prependToolbar?: Snippet;
	}

	let {
		value = $bindable(),
		onSave,
		prependToolbar,
		onCancel,
		class: className = ''
	}: Props = $props();

	let editorElement = $state<HTMLElement>();
	let editor = $state<HalkaEditor>();
	let color = $state('#000000');

	let bold = $state(false);
	let italic = $state(false);
	let underline = $state(false);
	let link = $state(false);

	function updateToolbar() {
		if (!editor) return;
		bold = editor.query.isActive('STRONG') || editor.query.isActive('B');
		italic = editor.query.isActive('EM') || editor.query.isActive('I');
		underline = editor.query.isActive('U');
		link = editor.query.isActive('A');
		color = editor.getStyle('color') || '#000000';
	}

	onMount(() => {
		if (editorElement) {
			editor = new HalkaEditor(editorElement, {
				inline: true,
				plugins: [linkPlugin, placeholderPlugin('Write something here...')],
				shortcuts: true
			});
			editor.onShortcut('enter', (e: KeyboardEvent) => {
				e.preventDefault();
				onSave();
			});

			if (value) editor.setHTML(value);

			editor.on('change', () => {
				if (editorElement) value = editorElement.innerHTML;
				updateToolbar();
			});
			updateToolbar();
		}
	});

	onDestroy(() => {
		editor?.destroy();
	});

	$effect(() => {
		if (editor && editorElement && editorElement.innerHTML !== value) {
			if (document.activeElement !== editorElement) {
				editorElement.innerHTML = value;
			}
		}
	});

	function insertLink() {
		if (!editor) return;
		if (link) {
			editor.execCommand('link.unlink');
		} else {
			const url = window.prompt('Enter Link URL:');
			if (url) {
				editor.execCommand('link.toggle', { href: url });
			}
		}
	}

	function setStyle(property: string, val?: string) {
		editor?.setInlineStyle(property, val);
	}

	function toggleMark(tag: string) {
		editor?.transforms.toggleMark(tag);
	}

	function attachEditorElement(node: HTMLElement) {
		editorElement = node;
		return {
			destroy() {
				if (editorElement === node) {
					editorElement = undefined;
				}
			}
		};
	}
</script>

<div class="rte-inline-editor {className}">
	<div class="rte-inline-toolbar">
		{#if prependToolbar}
			{@render prependToolbar()}
		{/if}
		<Button
			variant={bold ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon-sm"
			onclick={() => toggleMark('STRONG')}
			title="Bold"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
		</Button>
		<Button
			variant={italic ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon-sm"
			onclick={() => toggleMark('EM')}
			title="Italic"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
		</Button>
		<Button
			variant={underline ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon-sm"
			onclick={() => toggleMark('U')}
			title="Underline"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>
		</Button>
		<div class="rte-divider"></div>
		<Button
			variant={link ? 'secondary' : 'ghost'}
			size="icon"
			className="rte-btn--icon-sm"
			onclick={insertLink}
			title="Link"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
		</Button>
		<div class="rte-divider"></div>
		{#if onCancel}
			<Button
				variant="ghost"
				size="icon"
				className="rte-btn--icon-sm rte-btn--destructive-text"
				onclick={onCancel}
				title="Cancel"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
			</Button>
		{/if}
		<Button
			variant="ghost"
			size="icon"
			className="rte-btn--icon-sm rte-btn--success-text"
			onclick={onSave}
			title="Save"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
		</Button>
	</div>

	<div use:attachEditorElement class="rte-inline-editor-content"></div>
</div>
