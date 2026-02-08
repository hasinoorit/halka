import type { Editor, HalkaPlugin } from '../core/editor.js';

export const placeholderPlugin = (placeholder: string): HalkaPlugin => (editor: Editor) => {
    const root = editor.root;
    root.setAttribute('data-placeholder', placeholder);

    const injectStyles = () => {
        const doc = root.ownerDocument;
        const id = 'halka-placeholder-styles';
        if (doc.getElementById(id)) return;

        const style = doc.createElement('style');
        style.id = id;
        style.textContent = `
			.halka-editor[data-placeholder]:before {
				content: attr(data-placeholder);
				position: absolute;
				color: #a1a1aa;
				pointer-events: none;
				display: none;
			}
			.halka-editor.halka-is-empty:before {
				display: block;
			}
		`;
        doc.head.appendChild(style);
    };

    const update = () => {
        const html = editor.getHTML();
        // Halka uses <p><br></p> as empty state
        if (html === '<p><br></p>' || html === '' || root.textContent?.trim() === '') {
            root.classList.add('halka-is-empty');
        } else {
            root.classList.remove('halka-is-empty');
        }
    };

    injectStyles();
    root.classList.add('halka-editor'); // Ensure class for styling

    editor.on('change', update);

    // Also listen to input for faster feedback
    root.addEventListener('input', update);

    update();

    return () => {
        editor.off('change', update);
        root.removeEventListener('input', update);
    };
};
