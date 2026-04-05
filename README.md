# Halka

A headless, framework-agnostic rich text editor kernel for the web.

[Live Demo](https://halkaeditor.pages.dev/)

Halka gives you a robust editing core — commands, queries, transforms, selection management, and a plugin system — without rendering any UI. You build the toolbar, menus, and chrome; Halka handles the DOM.

## Features

- **Headless** — zero UI opinions; you own every pixel.
- **Plugin architecture** — extend with first-party or custom plugins.
- **Clean DOM** — collapsed formatting uses virtual "pending formats" instead of zero-width spaces.
- **Selection stability** — selection is saved on blur and restored before operations automatically.
- **Schema-aware** — built-in block / inline / void categorization.

---

## Installation

```bash
pnpm add halka
```

## Importing

```ts
// Core
import { HalkaEditor, definePlugin } from 'halka';

// Plugins (tree-shakeable, each has its own export)
import { historyPlugin }          from 'halka/plugins/history';
import { linkPlugin }             from 'halka/plugins/link';
import { listPlugin }             from 'halka/plugins/list';
import { imagePlugin }            from 'halka/plugins/image';
import { tablePlugin }            from 'halka/plugins/table';
import { footnotePlugin }         from 'halka/plugins/footnote';
import { pastePlugin }            from 'halka/plugins/paste';
import { placeholderPlugin }      from 'halka/plugins/placeholder';
import { markdownShortcutsPlugin } from 'halka/plugins/markdown-shortcuts';
```

---

## Quick Start

```ts
const root = document.getElementById('editor')!;

const editor = new HalkaEditor(root, {
  plugins: [
    historyPlugin,
    pastePlugin,
    linkPlugin,
    listPlugin,
    imagePlugin,
    tablePlugin,
    footnotePlugin,
    markdownShortcutsPlugin,
    placeholderPlugin('Start writing…')
  ]
});

editor.setHTML('<p>Hello world</p>');

// React to changes
editor.on('change', (html) => {
  console.log('Content changed:', html);
});

// Clean up
editor.destroy();
```

---

## Core API

### `new HalkaEditor(root, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `root` | `HTMLElement` | The editable container. Halka sets `contentEditable="true"` if needed. |
| `options.plugins` | `HalkaPlugin[]` | Plugins to install. |
| `options.shortcuts` | `boolean` | Enable built-in keyboard shortcuts (`Mod+B`, `Mod+I`, `Mod+U`). Default: `true`. |

### Content

| Method | Returns | Description |
|--------|---------|-------------|
| `getHTML()` | `string` | Get the current inner HTML of the editor. |
| `setHTML(html)` | `void` | Replace editor content entirely. |
| `insertHTML(html)` | `void` | Insert HTML at the current selection, replacing any selected content. |
| `insertText(text)` | `void` | Insert plain text at the current selection. |

### Inline Formatting

| Method | Description |
|--------|-------------|
| `toggleInlineFormat('bold')` | Wraps / unwraps selection in `<strong>`. |
| `toggleInlineFormat('italic')` | Wraps / unwraps selection in `<em>`. |
| `toggleInlineFormat('underline')` | Wraps / unwraps selection in `<u>`. |
| `toggleInlineFormat('code')` | Wraps / unwraps selection in `<code>`. |

When the selection is collapsed (just a cursor), toggling a format that already wraps the cursor **removes the entire formatting element**. If the format is not active, it sets a pending format — the next character typed will be wrapped.

### Inline Styles

```ts
editor.setInlineStyle('color', '#e11d48');          // apply
editor.setInlineStyle('font-size', '20px');         // apply
editor.setInlineStyle('color');                     // remove
```

- If a `<span>` already wraps the selection, the style is updated in place.
- Removing a style that was the only property on a `<span>` unwraps the span entirely.

### Block Formatting

```ts
editor.toggleBlockFormat('h1');         // current block → <h1>, or back to <p>
editor.toggleBlockFormat('h2');
editor.toggleBlockFormat('h3');
editor.toggleBlockFormat('blockquote');
editor.toggleBlockFormat('p');          // explicit paragraph
```

### Block Styles

```ts
editor.setBlockStyle('text-align', 'center');
editor.setBlockStyle('text-align');                 // remove
```

Applies or removes a CSS property on the current block-level element.

### Format Inspection

| Method | Returns | Description |
|--------|---------|-------------|
| `hasFormat(format)` | `boolean` | Check if format is active (e.g., `'bold'`, `'italic'`). |
| `getStyle(property)` | `string \| undefined` | Get the computed style at the current selection (e.g., `'color'`). |

---

## Selection API

Accessible via `editor.selection`.

| Method | Returns | Description |
|--------|---------|-------------|
| `.isCollapsed` | `boolean` | `true` if caret (no range selected). |
| `.collapseToStart(node?)` | `this` | Collapse to start of node, or current range start. |
| `.collapseToEnd(node?)` | `this` | Collapse to end of node, or current range end. |
| `.selectAll(node)` | `this` | Select entire contents of a node. |
| `.setCursorBefore(node)` | `this` | Place cursor immediately before a node. |
| `.setCursorAfter(node)` | `this` | Place cursor immediately after a node. |
| `.setCursorAtStart(node)` | `this` | Place cursor at start of a node's contents. |
| `.setCursorAtEnd(node)` | `this` | Place cursor at end of a node's contents. |
| `.setCursorAt(node, offset)` | `this` | Place cursor at a specific text offset within a node. |
| `.isAtStart()` | `boolean` | Is the cursor at the very start of the current block? |
| `.isAtEnd()` | `boolean` | Is the cursor at the very end of the current block? |
| `.move(offset, unit?)` | `this` | Move cursor by `offset` characters. |
| `.expandTo(unit)` | `this` | Expand selection to `'word'`, `'sentence'`, `'line'`, or `'block'` boundaries. |
| `.preserveSelection(cb)` | `this` | Run a callback that mutates the DOM, then restore the selection to where it was. Uses hidden marker spans. |
| `.createMarkers()` | `{ startId, endId } \| null` | Insert hidden marker spans at selection boundaries. |
| `.restoreMarkers(ids)` | `void` | Restore selection from markers and remove them. |

### Selection Restoration

Halka automatically saves the selection on blur and restores it before any operation. This means toolbar buttons work correctly even though clicking them moves focus out of the editor.

```ts
// Low-level if needed:
editor.getRange();           // returns current or last-saved Range
editor.setSelection(range);  // set a specific Range
editor.applySelection();     // restore saved selection
editor.normalizeSelection(); // ensure selection is inside the editor
```

---

## Query API

Accessible via `editor.query`.

| Method | Returns | Description |
|--------|---------|-------------|
| `.isActive(tagName)` | `boolean` | Is the given tag active at the cursor? Checks pending formats first, then DOM. |
| `.findClosest(tagName)` | `Element \| null` | Walk up from the selection to find the nearest ancestor with this tag. |
| `.matchPath(predicate)` | `Node \| null` | Walk up from selection, return first node matching the predicate. |
| `.getCurrentBlock()` | `Element \| null` | Get the current block element (e.g., `<p>`, `<h1>`, `<li>`). |
| `.isBlock(tagName)` | `boolean` | Is this a block-level tag? |
| `.isInline(tagName)` | `boolean` | Is this an inline tag? |
| `.isVoid(tagName)` | `boolean` | Is this a void (self-closing) tag? |

---

## Transform API

Accessible via `editor.transforms`. All methods are **chainable**.

| Method | Description |
|--------|-------------|
| `.wrap(tagName)` | Wrap current selection in a new element. |
| `.unwrap(tagName)` | Remove the wrapping element of this tag from the selection. |
| `.toggleMark(tagName)` | Toggle an inline format. Smart: unwraps the whole element if cursor is collapsed inside it. |
| `.insertText(text, formats?)` | Insert text, optionally wrapped in a set of format tags. |
| `.insertNode(node)` | Insert a DOM node at the current selection. |
| `.deleteSelection()` | Delete the selected content. |
| `.collapseToEnd()` | Collapse selection to end. |
| `.collapseToStart()` | Collapse selection to start. |

```ts
editor.transforms
  .wrap('STRONG')
  .insertText(' — appended')
  .collapseToEnd();
```

---

## Transactions

All DOM mutations should happen inside `runTransaction` to ensure proper normalization and change events.

```ts
editor.runTransaction((ed) => {
  const block = ed.query.getCurrentBlock();
  // … mutate the DOM …
});
```

- Before the callback, Halka focuses the editor and restores saved selection if needed.
- After the callback, Halka merges adjacent identical nodes and emits `change` if content changed.

---

## Events

| Event | Data | When |
|-------|------|------|
| `change` | `string` (HTML) | Content changed. |
| `formatChange` | — | Active format state changed (selection moved, pending format toggled). |

```ts
editor.on('change', (html) => { /* save */ });
editor.on('formatChange', () => { /* update toolbar buttons */ });
```

---

## Commands & State

### Commands

Plugins register named commands. You execute them from your UI.

```ts
editor.registerCommand('myCommand', (payload) => { /* … */ });
editor.execCommand('myCommand', { key: 'value' });
editor.unregisterCommand('myCommand', handler);
```

### State

Plugins register named state queries. You read them synchronously.

```ts
editor.registerState('myState', (payload) => computeValue());
const value = editor.getState('myState');
editor.unregisterState('myState', handler);
```

### Shortcuts

```ts
// Bind a shortcut to a callback
editor.onShortcut('mod+k', (event) => {
  event.preventDefault();
  openLinkDialog();
});

// Unbind
editor.offShortcut('mod+k', handler);
```

Shortcut format: modifiers joined with `+`. Use `mod` for `Cmd` (Mac) / `Ctrl` (Windows). Examples: `mod+b`, `mod+shift+z`, `tab`, `shift+tab`.

---

## Schema

Halka's schema categorizes HTML tags into three groups:

| Category | Tags |
|----------|------|
| **Blocks** | `P`, `DIV`, `H1`–`H6`, `UL`, `OL`, `LI`, `BLOCKQUOTE`, `PRE`, `TABLE`, `TBODY`, `THEAD`, `TR`, `TD`, `TH` |
| **Inlines** | `SPAN`, `A`, `STRONG`, `B`, `EM`, `I`, `U`, `CODE`, `MARK`, `SUB`, `SUP`, `S`, `STRIKE`, `SMALL` |
| **Voids** | `IMG`, `BR`, `HR`, `INPUT` |

---

## Pending Formats (Zero-Width-Space-Free)

When the selection is collapsed and you toggle a format, Halka doesn't insert any invisible characters. Instead, it stores the format in a pending set. The next character typed is wrapped in the pending formats automatically.

```ts
editor.addPendingFormat('STRONG');
editor.addPendingFormat('EM');
// User types "hello" → <strong><em>hello</em></strong>
editor.clearPendingFormats();
```

---

## Creating Plugins

### Using `definePlugin` (declarative)

```ts
import { definePlugin } from 'halka';

export const myPlugin = definePlugin({
  name: 'my-plugin',

  // Named commands callable via editor.execCommand()
  commands: {
    'myPlugin.doSomething': (editor, payload) => {
      editor.runTransaction(() => { /* … */ });
    }
  },

  // Named state queries readable via editor.getState()
  states: {
    'myPlugin.isActive': (editor) => {
      return editor.query.findClosest('MY-TAG') !== null;
    }
  },

  // Keyboard shortcuts
  shortcuts: {
    'mod+shift+k': 'myPlugin.doSomething',          // maps to command name
    'enter': (editor, event) => { /* custom */ }     // or inline handler
  },

  // DOM event listeners on the editor root
  events: {
    paste: (editor, event) => { /* … */ }
  }
});
```

### Using a factory function (imperative)

```ts
import type { HalkaPlugin, Editor } from 'halka';

export const myPlugin: HalkaPlugin = (editor: Editor) => {
  // Setup: register commands, listeners, etc.
  const handler = () => { /* … */ };
  editor.registerCommand('myCommand', handler);

  // Return cleanup function
  return () => {
    editor.unregisterCommand('myCommand', handler);
  };
};
```

---

## Built-in Plugins

### History

Undo/redo with automatic change grouping.

```ts
import { historyPlugin } from 'halka/plugins/history';
```

| Command | Description |
|---------|-------------|
| `history.undo` | Undo the last change. |
| `history.redo` | Redo the last undone change. |

| Shortcut | Action |
|----------|--------|
| `Mod+Z` | Undo |
| `Mod+Shift+Z` | Redo |
| `Mod+Y` | Redo |

Changes made within 1 minute are grouped into a single undo step. A pause longer than 1 minute commits the group.

---

### Link

Create, edit, and remove hyperlinks.

```ts
import { linkPlugin } from 'halka/plugins/link';
```

| Command | Payload | Description |
|---------|---------|-------------|
| `link.toggle` | `{ href, target?, rel? }` | Smart toggle. If no link exists, creates one. If link exists and `href` is provided, updates it. If `href` is `''` (empty), removes the link. |
| `link.update` | `{ href?, target?, rel? }` | Update attributes of the link at the cursor. Empty `href` removes the link. |
| `link.unlink` | — | Remove the link at the cursor, keeping the text. |

| State | Returns | Description |
|-------|---------|-------------|
| `link.active` | `{ href, target, rel } \| null` | Get the active link's attributes, or `null` if cursor is not inside a link. |

```ts
// Create a link
editor.execCommand('link.toggle', {
  href: 'https://example.com',
  target: '_blank',
  rel: 'noreferrer'
});

// Check if cursor is inside a link
const linkInfo = editor.getState('link.active');
// → { href: 'https://example.com', target: '_blank', rel: 'noreferrer' }

// Update the URL
editor.execCommand('link.toggle', { href: 'https://new-url.com' });

// Remove the link (submit with empty href)
editor.execCommand('link.toggle', { href: '' });
```

---

### List

Ordered and unordered lists with indent/outdent.

```ts
import { listPlugin } from 'halka/plugins/list';
```

| Command | Description |
|---------|-------------|
| `list.toggleUnordered` | Toggle the current block into/out of a `<ul>`. |
| `list.toggleOrdered` | Toggle the current block into/out of an `<ol>`. |
| `list.indent` | Nest the current list item one level deeper. |
| `list.outdent` | Un-nest the current list item one level. |

| Shortcut | Action |
|----------|--------|
| `Mod+Shift+8` | Toggle unordered list |
| `Mod+Shift+7` | Toggle ordered list |
| `Tab` | Indent |
| `Shift+Tab` | Outdent |

---

### Image

Insert and update images.

```ts
import { imagePlugin } from 'halka/plugins/image';
```

| Command | Payload | Description |
|---------|---------|-------------|
| `image.insert` | `{ src, alt?, title? }` | Insert an `<img>` at the cursor. |
| `image.update` | `{ src?, alt?, title? }` | Update attributes of the image at the cursor. |

```ts
editor.execCommand('image.insert', {
  src: 'https://example.com/photo.jpg',
  alt: 'A beautiful photo'
});
```

---

### Table

Full table editing with cell merging/splitting, row/column operations, and cell styling.

```ts
import { tablePlugin } from 'halka/plugins/table';
```

| Command | Payload | Description |
|---------|---------|-------------|
| `table.insert` | `{ rows?, columns?, header?, footer?, caption? }` | Insert a new table. |
| `table.addColumn` | `boolean` | Add a column. `true` = after, `false` = before the current cell. |
| `table.addRow` | `boolean` | Add a row. `true` = below, `false` = above the current row. |
| `table.removeColumn` | — | Remove the current column. |
| `table.removeRow` | — | Remove the current row. |
| `table.mergeCells` | — | Merge selected cells. |
| `table.splitCell` | — | Split a previously merged cell. |
| `table.styleCell` | `{ property, value? }` | Set/remove a CSS property on the current cell. |
| `table.styleRow` | `{ property, value? }` | Set/remove a CSS property on the current row. |
| `table.styleTable` | `{ property, value? }` | Set/remove a CSS property on the table. |
| `table.getCellStyles` | `{ callback }` | Get computed styles of the current cell. |
| `table.getRowStyles` | `{ callback }` | Get computed styles of the current row. |
| `table.getTableStyles` | `{ callback }` | Get computed styles of the table. |

```ts
editor.execCommand('table.insert', {
  rows: 3,
  columns: 4,
  header: true
});

editor.execCommand('table.addRow', true);    // add row below
editor.execCommand('table.addColumn', true); // add column after

editor.execCommand('table.styleCell', {
  property: 'background-color',
  value: '#fef3c7'
});
```

The table plugin also supports multi-cell selection via mouse drag.

---

### Footnote

Academic-style footnotes with inline citations and a managed footnote list.

```ts
import { footnotePlugin } from 'halka/plugins/footnote';
```

| Command | Payload | Description |
|---------|---------|-------------|
| `footnote.addItem` | `string` (HTML) | Add a new footnote to the list. |
| `footnote.removeItem` | `string` (id) | Remove a footnote by ID. |
| `footnote.moveItem` | `{ id, index }` | Reorder a footnote to a new position. |
| `footnote.editItem` | `{ id, content }` | Edit a footnote's content. |
| `footnote.insertCitation` | `string` (footnoteId) | Insert a superscript citation `[1]` at the cursor linking to the footnote. |

| State | Returns | Description |
|-------|---------|-------------|
| `footnote.items` | `FootnoteItem[]` | Get all footnote items as `{ id, content }`. |

```ts
// Add a footnote
editor.execCommand('footnote.addItem', '<p>See original source.</p>');

// Read all footnotes
const items = editor.getState('footnote.items');
// → [{ id: 'fn-abc123', content: '<p>See original source.</p>' }]

// Insert a citation at cursor
editor.execCommand('footnote.insertCitation', items[0].id);

// Edit
editor.execCommand('footnote.editItem', {
  id: items[0].id,
  content: '<p>Updated source.</p>'
});

// Remove
editor.execCommand('footnote.removeItem', items[0].id);
```

Citations auto-number and backlinks update when footnotes are reordered or removed.

---

### Paste

Sanitizes pasted HTML, stripping disallowed tags while preserving formatting and structure.

```ts
import { pastePlugin } from 'halka/plugins/paste';
```

No commands — it works automatically by intercepting `paste` events.

**Allowed tags:**
- Block: `P`, `H1`–`H6`, `BLOCKQUOTE`, `UL`, `OL`, `TABLE`, `PRE`
- Inline: `B`, `I`, `U`, `STRONG`, `EM`, `A`, `SPAN`, `CODE`, `SUB`, `SUP`, `MARK`, `BR`

**Blocked tags:** `SCRIPT`, `STYLE`, `META`, `LINK`, `IFRAME`, `OBJECT`, etc.

Plain text paste is wrapped in `<p>` tags (one per line).

---

### Placeholder

Shows placeholder text when the editor is empty.

```ts
import { placeholderPlugin } from 'halka/plugins/placeholder';

// Note: this plugin is a factory — call it with the placeholder text
const editor = new HalkaEditor(root, {
  plugins: [placeholderPlugin('Start writing…')]
});
```

Requires the editor root to have the class `halka-editor` (added automatically). Uses CSS `:before` pseudo-element for a clean, non-intrusive implementation.

---

### Markdown Shortcuts

Type markdown-style prefixes and press `Space` to convert.

```ts
import { markdownShortcutsPlugin } from 'halka/plugins/markdown-shortcuts';
```

| Input | Result |
|-------|--------|
| `# ` | Heading 1 (`<h1>`) |
| `## ` | Heading 2 (`<h2>`) |
| `### ` | Heading 3 (`<h3>`) |
| `> ` | Blockquote (`<blockquote>`) |
| `- ` or `* ` | Unordered list |
| `1. ` | Ordered list |

---

## Built-in Shortcuts

| Shortcut | Action |
|----------|--------|
| `Mod+B` | Toggle bold |
| `Mod+I` | Toggle italic |
| `Mod+U` | Toggle underline |
| `Mod+Z` | Undo |
| `Mod+Shift+Z` | Redo |
| `Mod+Y` | Redo |
| `Mod+Shift+8` | Toggle unordered list |
| `Mod+Shift+7` | Toggle ordered list |
| `Tab` | Indent list item |
| `Shift+Tab` | Outdent list item |

`Mod` = `Cmd` on macOS, `Ctrl` on Windows/Linux.

---

## Lifecycle

```ts
const editor = new HalkaEditor(root, { plugins: [...] });

// Use the editor…

// When done:
editor.destroy();
```

`destroy()` removes all event listeners, cleans up plugin state, and clears internal maps.

---

## Testing

```bash
pnpm run test           # unit + e2e
pnpm run test:unit      # vitest (watch mode)
pnpm run test:e2e       # playwright
```

---

## License

MIT
