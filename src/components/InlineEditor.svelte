<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { HalkaEditor } from '$lib/index.js';
	import { linkPlugin } from '$lib/plugins/link.js';
	import { placeholderPlugin } from '$lib/plugins/placeholder.js';
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

	// Toolbar states
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
				plugins: [linkPlugin, placeholderPlugin('')],
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

<div class={`flex flex-col border rounded-md overflow-hidden ${className}`}>
	<!-- Toolbar -->
	<div class="flex items-center gap-1 border-b bg-muted/30 p-1">
		{#if prependToolbar}
			{@render prependToolbar()}
		{/if}
		<Button
			variant={bold ? 'secondary' : 'ghost'}
			size="icon"
			className="h-7 w-7"
			onclick={() => toggleMark('STRONG')}
			title="Bold"
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
				><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path
					d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"
				/></svg
			>
		</Button>
		<Button
			variant={italic ? 'secondary' : 'ghost'}
			size="icon"
			className="h-7 w-7"
			onclick={() => toggleMark('EM')}
			title="Italic"
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
				><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line
					x1="15"
					y1="4"
					x2="9"
					y2="20"
				/></svg
			>
		</Button>
		<Button
			variant={underline ? 'secondary' : 'ghost'}
			size="icon"
			className="h-7 w-7"
			onclick={() => toggleMark('U')}
			title="Underline"
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
				><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line
					x1="4"
					y1="21"
					x2="20"
					y2="21"
				/></svg
			>
		</Button>
		<div class="w-px h-4 bg-border mx-1"></div>
		<ColorPicker
			bind:value={color}
			label="A"
			className="h-7 w-7 p-0"
			onSelectColor={(c) => setStyle('color', c)}
			onClearColor={() => setStyle('color')}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
			>
				<path
					d="M6 18L10.8 6h2.4L18 18h-2.2l-1.2-3.5H9.4L8.2 18H6zm4.1-5.5h3.8L12 7.8l-1.9 4.7z"
					fill="currentColor"
				/>
				<rect x="4" y="20" width="16" height="3" rx="0.5" fill={color} />
			</svg>
		</ColorPicker>
		<div class="w-px h-4 bg-border mx-1"></div>
		<Button
			variant={link ? 'secondary' : 'ghost'}
			size="icon"
			className="h-7 w-7"
			onclick={insertLink}
			title="Link"
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
				><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
					d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
				/></svg
			>
		</Button>
		<div class="w-px h-4 bg-border mx-1"></div>
		{#if onCancel}
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
				onclick={onCancel}
				title="Cancel"
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
					stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
				>
			</Button>
		{/if}
		<Button
			variant="ghost"
			size="icon"
			className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
			onclick={onSave}
			title="Save"
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
				><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline
					points="17 21 17 13 7 13 7 21"
				/><polyline points="7 3 7 8 15 8" /></svg
			>
		</Button>
	</div>

	<!-- Editor Area -->
        <div use:attachEditorElement class="p-3 focus:outline-none text-sm"></div>
</div>
