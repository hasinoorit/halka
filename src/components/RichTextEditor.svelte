<script lang="ts">
	import RichTextEditor from '../rich-text-editor/RichTextEditor.svelte';

	interface Props {
		content?: string;
		class?: string;
		placeholder?: string;
		onChange?: (html: string) => void;
	}

	let { content = $bindable(''), ...rest }: Props = $props();
</script>

<RichTextEditor bind:content {...rest} />
