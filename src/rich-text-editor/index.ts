export { default as RichTextEditor } from './RichTextEditor.svelte';
export { default as InlineEditor } from './InlineEditor.svelte';
export { default as FootnoteManager } from './FootnoteManager.svelte';
export { default as FindReplace } from './FindReplace.svelte';
export { HalkaEditor } from 'halka';
export type { HalkaOptions, HalkaPlugin } from 'halka';
export const htmlToPlainText = (html: string) => {
	return html.replace(/<[^>]*>?/g, '').trim();
};