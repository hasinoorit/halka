export type PluginStateDoc = {
	name: string;
	description: string;
};

export type PluginDoc = {
	slug: string;
	title: string;
	description: string;
	importPath: string;
	commands?: { name: string; description: string }[];
	states?: PluginStateDoc[];
	/** Code example for editor.getState() — shown on the plugin docs page */
	stateExample?: string;
	/** Code example for editor.query patterns when the plugin has no registered state */
	queryExample?: string;
	shortcuts?: { keys: string; action: string }[];
	usageTips?: string[];
	example?: string;
	notes?: string;
	demoNote?: string;
};

export const PLUGINS: PluginDoc[] = [
	{
		slug: 'history',
		title: 'History',
		description: 'Undo/redo with automatic change grouping.',
		importPath: "import { historyPlugin } from 'halka/plugins/history';",
		commands: [
			{ name: 'history.undo', description: 'Undo the last change' },
			{ name: 'history.redo', description: 'Redo the last undone change' }
		],
		shortcuts: [
			{ keys: 'Mod+Z', action: 'Undo' },
			{ keys: 'Mod+Shift+Z / Mod+Y', action: 'Redo' }
		],
		usageTips: [
			'Add historyPlugin to your plugins array — undo/redo work automatically',
			'Changes are grouped so rapid typing produces one undo step'
		]
	},
	{
		slug: 'link',
		title: 'Link',
		description: 'Create, edit, and remove hyperlinks.',
		importPath: "import { linkPlugin } from 'halka/plugins/link';",
		commands: [
			{ name: 'link.toggle', description: 'Create, update, or remove link (empty href removes)' },
			{ name: 'link.update', description: 'Update link attributes at cursor' },
			{ name: 'link.unlink', description: 'Remove link, keep text' }
		],
		states: [{ name: 'link.active', description: 'Active link attributes or null' }],
		stateExample: `const link = editor.getState('link.active') as {
  href: string;
  target: string;
  rel: string;
} | null;

// null when the caret is not inside a link
if (link) {
  console.log(link.href);
}

// Refresh when selection changes (e.g. toolbar)
editor.on('formatChange', () => {
  const active = editor.getState('link.active');
});`,
		usageTips: [
			'Select text and call link.toggle to wrap in <a>',
			'link.toggle with empty href removes the link',
			'Use link.active state to populate an edit-link dialog'
		],
		example: `editor.execCommand('link.toggle', {
  href: 'https://example.com',
  target: '_blank'
});`
	},
	{
		slug: 'list',
		title: 'List',
		description: 'Ordered and unordered lists with indent/outdent.',
		importPath: "import { listPlugin } from 'halka/plugins/list';",
		commands: [
			{ name: 'list.toggleUnordered', description: 'Toggle UL' },
			{ name: 'list.toggleOrdered', description: 'Toggle OL' },
			{ name: 'list.indent', description: 'Nest list item' },
			{ name: 'list.outdent', description: 'Un-nest list item' }
		],
		shortcuts: [
			{ keys: 'Mod+Shift+8', action: 'Toggle unordered list' },
			{ keys: 'Mod+Shift+7', action: 'Toggle ordered list' },
			{ keys: 'Tab / Shift+Tab', action: 'Indent / outdent' }
		],
		states: [{ name: 'list.active', description: 'Active list type at caret, or null' }],
		stateExample: `const listActive = editor.getState('list.active') as {
  type: 'ul' | 'ol';
} | null;

const isBulletList = listActive?.type === 'ul';
const isOrderedList = listActive?.type === 'ol';

editor.on('formatChange', () => {
  const activeList = editor.getState('list.active');
});`,
		usageTips: [
			'Toggle bullet or numbered list from your toolbar',
			'Tab indents nested list items, Shift+Tab outdents',
			'Combine with markdown-shortcuts plugin: type "- " or "1. " + Space',
			'Read list.active on formatChange to highlight list toolbar buttons'
		],
		example: `editor.execCommand('list.toggleUnordered');
editor.execCommand('list.indent');
editor.execCommand('list.outdent');`
	},
	{
		slug: 'image',
		title: 'Image',
		description: 'Insert and update images with inline or block layout.',
		importPath: "import { imagePlugin, inferImageLayout } from 'halka/plugins/image';",
		commands: [
			{
				name: 'image.insert',
				description: 'Insert image at cursor; layout: "inline" (default) or "block"'
			},
			{
				name: 'image.update',
				description: 'Update selected image src, alt, title, layout, and sizing styles'
			}
		],
		states: [
			{
				name: 'image.active',
				description: '{ src, alt, title, layout: "inline" | "block", style } or null'
			}
		],
		stateExample: `const image = editor.getState('image.active') as {
  src: string;
  alt: string;
  title: string;
  layout: 'inline' | 'block';
  style: { display: string; width: string; height: string; maxWidth: string };
} | null;

// null when the caret is in text; set when an <img> is selected
const imageSelected = image !== null;
const canEditLayout = image?.layout;

editor.on('formatChange', () => {
  const active = editor.getState('image.active');
});`,
		usageTips: [
			'Click an image to select it, then use the toolbar image button to edit',
			'layout: "inline" places the image inside the current paragraph (like text flow)',
			'layout: "block" creates a dedicated <p><img></p> on its own line',
			'Inline layout applies display: inline by default; block layout applies display: block and max-width: 100%',
			'Layout is inferred from DOM structure in image.active — no layout classes required',
			'image.update can convert inline ↔ block by restructuring the DOM',
			'Optional style: { width, height, maxWidth } for sizing; display can be overridden via style'
		],
		example: `// Inline image in a sentence
editor.execCommand('image.insert', {
  src: 'https://example.com/icon.png',
  alt: 'Icon',
  layout: 'inline'
});

// Block image on its own line
editor.execCommand('image.insert', {
  src: 'https://example.com/photo.jpg',
  alt: 'Photo',
  layout: 'block',
  style: { width: '300px' }
});

// Detect layout from existing HTML
const layout = inferImageLayout(imgElement, editor.root);`,
		notes:
			'Block images are detected when the image is the only meaningful child of a paragraph. Inline images share a paragraph with text or other content.'
	},
	{
		slug: 'table',
		title: 'Table',
		description: 'Full table editing with merge, styling, and multi-cell selection.',
		importPath: "import { tablePlugin } from 'halka/plugins/table';",
		commands: [
			{ name: 'table.insert', description: 'Insert table' },
			{ name: 'table.addRow / table.addColumn', description: 'Add row or column' },
			{ name: 'table.removeRow / table.removeColumn', description: 'Remove row or column' },
			{ name: 'table.mergeCells / table.splitCell', description: 'Merge or split cells' },
			{ name: 'table.styleCell / table.styleRow / table.styleTable', description: 'Apply CSS' }
		],
		states: [{ name: 'table.active', description: 'Table context at caret, or null' }],
		stateExample: `const tableActive = editor.getState('table.active') as {
  cell: {
    tagName: 'TD' | 'TH';
    colSpan: number;
    rowSpan: number;
    isMerged: boolean;
  } | null;
} | null;

const inTable = tableActive !== null;
const canSplitCell = tableActive?.cell?.isMerged ?? false;

editor.on('formatChange', () => {
  const active = editor.getState('table.active');
});`,
		usageTips: [
			'Insert table with row/column count and optional header row',
			'Add/remove rows and columns when cursor is in a cell',
			'Merge cells with multi-cell selection; split only works on merged cells',
			'Read table.active on formatChange to drive table toolbar (split when cell.isMerged)'
		],
		example: `editor.execCommand('table.insert', {
  rows: 3, columns: 4, header: true
});`,
		notes:
			'Split cell only affects merged cells (colSpan or rowSpan > 1). table.active.cell is null when the caret is in a table but not inside a cell.'
	},
	{
		slug: 'footnote',
		title: 'Footnote',
		description: 'Academic-style footnotes with citations.',
		importPath: "import { footnotePlugin } from 'halka/plugins/footnote';",
		commands: [
			{ name: 'footnote.addItem', description: 'Add footnote HTML' },
			{ name: 'footnote.insertCitation', description: 'Insert citation at cursor' },
			{ name: 'footnote.editItem / footnote.removeItem', description: 'Edit or remove' }
		],
		states: [{ name: 'footnote.items', description: 'Array of { id, content }' }],
		stateExample: `const items = editor.getState('footnote.items') as {
  id: string;
  content: string;
}[];

// Build a footnote manager UI from items
for (const item of items) {
  console.log(item.id, item.content);
}

editor.on('formatChange', () => {
  const footnotes = editor.getState('footnote.items');
});`,
		usageTips: [
			'Add footnote bodies with footnote.addItem',
			'Insert citation at cursor — auto-numbered superscript',
			'Read footnote.items state to build a footnote manager UI',
			'See /docs/svelte-ui for the in-repo FootnoteManager component'
		],
		example: `editor.execCommand('footnote.addItem', '<p>Source note.</p>');
const items = editor.getState('footnote.items');
editor.execCommand('footnote.insertCitation', items[0].id);`
	},
	{
		slug: 'paste',
		title: 'Paste',
		description: 'Sanitizes pasted HTML automatically.',
		importPath: "import { pastePlugin } from 'halka/plugins/paste';",
		usageTips: [
			'No commands — intercepts paste events automatically',
			'Paste from Word/Google Docs — disallowed tags are stripped',
			'Plain text paste creates one paragraph per line'
		],
		notes: 'No commands — intercepts paste events. Plain text is wrapped in paragraphs.'
	},
	{
		slug: 'placeholder',
		title: 'Placeholder',
		description: 'Placeholder text when editor is empty.',
		importPath: "import { placeholderPlugin } from 'halka/plugins/placeholder';",
		example: `placeholderPlugin('Start writing…')`,
		usageTips: [
			'Pass placeholder text as a factory argument',
			'Requires halka-editor class on root (added automatically by HalkaEditor)'
		],
		notes: 'Requires halka-editor class on root (added automatically).'
	},
	{
		slug: 'markdown-shortcuts',
		title: 'Markdown shortcuts',
		description: 'Type markdown prefixes + Space to convert.',
		importPath: "import { markdownShortcutsPlugin } from 'halka/plugins/markdown-shortcuts';",
		usageTips: [
			'Type at the start of a line, then press Space to convert',
			'# / ## / ### + Space → headings',
			'> + Space → blockquote',
			'- + Space → bullet list, 1. + Space → numbered list'
		],
		notes: '# → h1, ## → h2, > → blockquote, - → ul, 1. → ol'
	},
	{
		slug: 'find-replace',
		title: 'Find & replace',
		description: 'Search, highlight matches, replace one or all.',
		importPath: "import { findReplacePlugin } from 'halka/plugins/find-replace';",
		commands: [
			{ name: 'findReplace.open / close', description: 'Open or close panel' },
			{ name: 'findReplace.setOptions', description: 'Set query, replacement, options' },
			{ name: 'findReplace.find / findNext / findPrevious', description: 'Navigate matches' },
			{ name: 'findReplace.replace / replaceAll', description: 'Replace matches' }
		],
		states: [{ name: 'findReplace.state', description: 'Query, match count, current index' }],
		stateExample: `const findState = editor.getState('findReplace.state') as {
  isOpen: boolean;
  query: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  matchCount: number;
  currentIndex: number;
  currentMatch: { start: number; end: number } | null;
};

// Drive a find/replace panel from state
if (findState.isOpen) {
  console.log(\`Match \${findState.currentIndex + 1} of \${findState.matchCount}\`);
}

editor.on('formatChange', () => {
  const state = editor.getState('findReplace.state');
});`,
		shortcuts: [
			{ keys: 'Mod+F', action: 'Open find' },
			{ keys: 'Mod+H', action: 'Open find & replace' }
		],
		usageTips: [
			'Open with Mod+F or Mod+H, or call findReplace.open',
			'Next/Previous navigate matches; highlight stays visible while find input has focus',
			'Case sensitive and whole word options via findReplace.setOptions',
			'Replace and Replace all update document and refresh matches'
		],
		example: `editor.execCommand('findReplace.open', { query: 'editor' });
editor.execCommand('findReplace.findNext');
editor.execCommand('findReplace.replaceAll');`,
		notes: 'Uses CSS Highlight API for match highlighting while find input has focus.'
	}
];

export const CORE_SECTIONS = [
	{ id: 'formatting', title: 'Text formatting', description: 'Inline/block formats, clearFormatting' },
	{ id: 'styles', title: 'Inline & block styles', description: 'CSS styles, clearStyles' },
	{ id: 'selection', title: 'Selection', description: 'Range, blur/restore, block boundaries' },
	{ id: 'block-delete', title: 'Block delete', description: 'Backspace/Delete at block edges' },
	{ id: 'inline-mode', title: 'Inline mode', description: 'inline: true constructor option' },
	{ id: 'shortcuts', title: 'Built-in shortcuts', description: 'Core keyboard shortcuts' }
] as const;
