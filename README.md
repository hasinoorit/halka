# Halka — Headless Rich Text Kernel

[Show me demo](https://halkaeditor.pages.dev/)

Halka is a framework-agnostic, DOM-centric rich text editor core. It provides a robust headless API to build toolbars, plugins, and UIs while keeping the DOM clean and semantic.

- Core focus: minimal DOM mutations, strong selection stability, strict normalization.
- Headless: you own the UI; Halka exposes commands, queries, transforms, and events.
- No-ZWS: collapsed formatting uses virtual “pending formats”; typing applies them without zero-width spaces.

## Install

```bash
pnpm add halka
# or
npm i halka
```

## Import

The package ships ESM with typed exports.

```ts
import { HalkaEditor, definePlugin } from 'halka';
import { listPlugin } from 'halka/plugins/list';
import { historyPlugin } from 'halka/plugins/history';
```

See exports in package manifest for available modules. Code references:
- Editor: [editor.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/editor.ts)
- Query: [query.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/query.ts)
- Transform: [transform.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/transform.ts)
- Selection: [selection.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/selection.ts)
- Range helpers: [range.ts](file:///Users/hasinoor/Desktop/halka/src/lib/helpers/range.ts)
- Node helpers: [node.ts](file:///Users/hasinoor/Desktop/halka/src/lib/helpers/node.ts)

## Quick Start

```ts
// Create an editable root
const root = document.createElement('div');
root.contentEditable = 'true';
document.body.appendChild(root);

// Initialize
const editor = new HalkaEditor(root, {
  shortcuts: true,
  plugins: [listPlugin, historyPlugin]
});

// Set content
editor.setHTML('<p>Hello world</p>');

// Toggle inline formats
editor.toggleInlineFormat('bold');      // wraps selection in <strong>
editor.toggleInlineFormat('italic');    // <em>
editor.toggleInlineFormat('underline'); // <u>

// Toggle block format
editor.toggleBlockFormat('h1');         // switches current block to <h1> or back to <p>

// Inline styles
editor.setInlineStyle('color', 'red');  // wraps with <span style="color:red">
editor.setInlineStyle('color');         // removes color, unwraps empty span
```

## Core API

### Construction
- new HalkaEditor(root, options?)
  - root: HTMLElement, must be contentEditable
  - options: { shortcuts?: boolean; plugins?: HalkaPlugin[] }
  - Default shortcuts include mod+b, mod+i, mod+u

### Content
- getHTML(): string
- setHTML(html: string): void
- insertHTML(html: string): void
- insertText(text: string): void

### Formats and Styles
- toggleInlineFormat(format: 'bold' | 'italic' | 'underline' | 'code'): void
- toggleBlockFormat(format: 'paragraph' | 'h1' | 'h2' | 'h3' | 'blockquote'): void
- setInlineStyle(property: string, value?: string): void
- setBlockStyle(property: string, value?: string): void

### Selection
- getSelection(): Selection | null
- getRange(): Range
- setSelection(range: Range): void
- applySelection(): void
- normalizeSelection(): void
- selection.preserveSelection(cb: (editor) => void): void — runs cb and restores the user selection afterward ([selection.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/selection.ts))
- registerNormalizer(fn: (range: Range) => Range | null): void — enforce caret correctness (e.g., ensure caret is inside an LI)

### Pending Formats (No‑ZWS)
- addPendingFormat(tagName: string): void
- removePendingFormat(tagName: string): void
- clearPendingFormats(): void
- getPendingFormats(): Set<string>
- Typing applies pending formats via beforeinput ([input.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/input.ts)).

### Commands, State, Events
- registerCommand(name: string, handler): void
- unregisterCommand(name: string, handler): void
- execCommand(name: string, payload?): void
- registerState(name: string, handler): void
- unregisterState(name: string, handler): void
- getState(name: string, payload?): unknown
- on(event: string, cb): void
- off(event: string, cb): void
- emit(event: string, data?): void
- onShortcut(desc: string, cb): void — desc like "mod+shift+8"
- offShortcut(desc: string, cb): void

### Query API
- isActive(tagName: string): boolean — respects pending formats when collapsed
- findClosest(tagName: string): Element | null
- getCurrentBlock(): Element | null
References: [query.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/query.ts)

### Transform API
Chainable mutations:
- wrap(tagName: string): this
- unwrap(tagName: string): this
- toggleMark(tagName: string): this
- insertText(text: string, formats?: Set<string>): this
- insertNode(node: Node): this
- collapseToEnd(): this
- collapseToStart(): this
- deleteSelection(): this
References: [transform.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/transform.ts)

## Plugins

### Declarative Plugin Definition
```ts
import { definePlugin } from 'halka';

export const myPlugin = definePlugin({
  name: 'my-plugin',
  commands: {
    'myPlugin.action': (editor) => { /* ... */ }
  },
  shortcuts: {
    'enter': (editor, e) => { /* ... */ },
    'mod+k': 'myPlugin.action'
  },
  events: {
    keydown: (editor, e) => { /* ... */ }
  }
});
```
References: [editor.ts:definePlugin](file:///Users/hasinoor/Desktop/halka/src/lib/core/editor.ts#L18-L59)

### Built-in Plugins
- List: list.toggleUnordered, list.toggleOrdered, list.indent, list.outdent
  - Shortcut: mod+shift+8 (unordered), mod+shift+7 (ordered), Tab/Shift+Tab for indent/outdent
  - Reference: [list.ts](file:///Users/hasinoor/Desktop/halka/src/lib/plugins/list.ts)
- History: history.undo, history.redo
  - Shortcuts: mod+z, mod+shift+z, mod+y
  - Reference: [history.ts](file:///Users/hasinoor/Desktop/halka/src/lib/plugins/history.ts)
- Footnote, Link, Image, Paste, Placeholder, Table — see [plugins directory](file:///Users/hasinoor/Desktop/halka/src/lib/plugins)

## Selection & Restoration
- Halka records text offsets before transactions and restores selection by offsets afterward.
- Reference: [editor.applySelection](file:///Users/hasinoor/Desktop/halka/src/lib/core/editor.ts#L575-L593), [range.restoreSelectionByOffsets](file:///Users/hasinoor/Desktop/halka/src/lib/helpers/range.ts#L478-L541)

## Normalization & Schema
- normalizeHTML ensures a default block `<p><br></p>` when content is empty.
- Selection normalizers ensure caret is inside valid containers (e.g., LI inside UL/OL).
- Schema class exposes block/inline/void categorization.
References: [editor.normalizeHTML](file:///Users/hasinoor/Desktop/halka/src/lib/core/editor.ts#L568-L574), [schema.ts](file:///Users/hasinoor/Desktop/halka/src/lib/core/schema.ts), [editor.registerDefaultNormalizers](file:///Users/hasinoor/Desktop/halka/src/lib/core/editor.ts#L809-L863)

## Shortcuts
- Built-in:
  - mod+b → toggleInlineFormat('bold') → `<strong>`
  - mod+i → toggleInlineFormat('italic') → `<em>`
  - mod+u → toggleInlineFormat('underline') → `<u>`
- Custom:
  - editor.onShortcut('mod+shift+8', (e) => editor.execCommand('list.toggleUnordered'))
Reference: [editor.onShortcut](file:///Users/hasinoor/Desktop/halka/src/lib/core/editor.ts#L685-L694)

## Headless UI Integration
Halka does not render UI; you build toolbars and menus and call the API:
- Button handlers call editor.toggleInlineFormat or execCommand.
- Reactive UI can observe `formatChange` and `change` events to highlight active states.
Reference: [editor.emit](file:///Users/hasinoor/Desktop/halka/src/lib/core/editor.ts#L681-L684)

## Testing
This repository includes unit and e2e tests.

```bash
pnpm run test:unit -- --run
pnpm run test:e2e
```

## Notes
- No-ZWS strategy means the DOM stays clean; pending formats apply on typing via beforeinput.
- Selection stability is handled via offsets; collapsed caret behaviors avoid inserting invisible characters.
