# Halka

A headless, framework-agnostic rich text editor kernel for the web.

**[Live demo](https://halkaeditor.pages.dev/demo)** · **[Full documentation](https://halkaeditor.pages.dev/docs)**

Halka gives you a robust editing core — commands, queries, transforms, selection management, and a plugin system — without rendering any UI. You build the toolbar, menus, and chrome; Halka handles the DOM.

## Features

- **Headless** — zero UI opinions; you own every pixel
- **Plugin architecture** — 10 first-party plugins (history, lists, tables, footnotes, find-replace, paste, and more)
- **Clean DOM** — collapsed formatting uses virtual “pending formats” instead of zero-width spaces
- **Selection stability** — selection is saved on blur and restored before operations
- **Schema-aware** — built-in block / inline / void categorization
- **clearFormatting vs clearStyles** — remove semantic tags or CSS `style` attributes separately

This repository also includes an optional **Svelte UI** (`src/rich-text-editor/`) used by the demo site. It is not published to npm.

## Installation

```bash
pnpm add halka
```

## Quick start

```ts
import { HalkaEditor } from 'halka';
import { historyPlugin } from 'halka/plugins/history';
import { pastePlugin } from 'halka/plugins/paste';
import { linkPlugin } from 'halka/plugins/link';
import { listPlugin } from 'halka/plugins/list';
import { imagePlugin } from 'halka/plugins/image';
import { tablePlugin } from 'halka/plugins/table';
import { footnotePlugin } from 'halka/plugins/footnote';
import { markdownShortcutsPlugin } from 'halka/plugins/markdown-shortcuts';
import { placeholderPlugin } from 'halka/plugins/placeholder';
import { findReplacePlugin } from 'halka/plugins/find-replace';

const root = document.getElementById('editor')!;

const editor = new HalkaEditor(root, {
  plugins: [
    historyPlugin,
    pastePlugin(),
    linkPlugin,
    listPlugin,
    imagePlugin,
    tablePlugin,
    footnotePlugin,
    markdownShortcutsPlugin,
    findReplacePlugin,
    placeholderPlugin('Start writing…')
  ]
});

editor.setHTML('<p>Hello world</p>');

editor.on('change', (data) => {
  const html = typeof data === 'string' ? data : data.html;
  console.log('Content changed:', html);
});

editor.destroy();
```

### History

`historyPlugin` uses a hybrid **action + diff** undo stack (not full HTML snapshots):

- Up to **100** undo steps (FIFO eviction)
- **5 second** typing debounce — idle typing merges into one step; blur commits pending edits
- Paste and `insertHTML` / `insertText` commit immediately
- Undo/redo restore **selection** as well as content
- Configure: `createHistoryPlugin({ maxSteps: 100, mergeMs: 5000 })`
- States: `history.canUndo`, `history.canRedo`, `history.stackDepth`

```ts
import { createHistoryPlugin } from 'halka/plugins/history';

const editor = new HalkaEditor(root, {
  plugins: [createHistoryPlugin({ mergeMs: 5000 })]
});
```

## Documentation

Detailed API reference, plugin commands, keyboard shortcuts, and interactive feature demos live on the docs site:

| Resource | URL |
|----------|-----|
| Documentation | https://halkaeditor.pages.dev/docs |
| Core API | https://halkaeditor.pages.dev/docs/core |
| Plugins | https://halkaeditor.pages.dev/docs/plugins/history |
| Svelte UI (in-repo) | https://halkaeditor.pages.dev/docs/svelte-ui |
| Live demo | https://halkaeditor.pages.dev/demo |

## Development

```bash
pnpm install
pnpm dev          # local demo/docs site
pnpm build        # build package + static site (output: docs/)
pnpm run test     # unit + e2e
pnpm run test:unit
pnpm run test:e2e
pnpm run check    # svelte-check
pnpm run lint
```

## License

MIT
