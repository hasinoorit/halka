import { computePosition, offset, flip, shift, autoUpdate, arrow } from '@floating-ui/dom';

function getTooltipHost(node: HTMLElement): HTMLElement {
	return node.closest('[popover]') ?? document.body;
}

export function tooltip(node: HTMLElement, content: string) {
	let tooltipEl: HTMLDivElement | null = null;
	let textEl: HTMLElement | null = null;
	let arrowEl: HTMLElement | null = null;
	let hostEl: HTMLElement | null = null;
	let cleanup: (() => void) | null = null;
	let timeout: ReturnType<typeof setTimeout> | null = null;

	function updatePosition() {
		if (!tooltipEl || !arrowEl || !hostEl) return;

		const inPopover = hostEl !== document.body;

		computePosition(node, tooltipEl, {
			strategy: inPopover ? 'absolute' : 'fixed',
			placement: 'top',
			middleware: [offset(6), flip(), shift({ padding: 8 }), arrow({ element: arrowEl })]
		}).then(({ x, y, placement, middlewareData }) => {
			if (!tooltipEl || !arrowEl) return;

			Object.assign(tooltipEl.style, {
				left: `${x}px`,
				top: `${y}px`,
				opacity: '1'
			});

			if (middlewareData.arrow) {
				const { x: arrowX, y: arrowY } = middlewareData.arrow;
				const staticSide = {
					top: 'bottom',
					right: 'left',
					bottom: 'top',
					left: 'right'
				}[placement.split('-')[0]];

				Object.assign(arrowEl.style, {
					left: arrowX != null ? `${arrowX}px` : '',
					top: arrowY != null ? `${arrowY}px` : '',
					right: '',
					bottom: '',
					[staticSide!]: '-3px'
				});
			}
		});
	}

	function show() {
		if (!content) return;

		timeout = setTimeout(() => {
			if (tooltipEl) return;

			hostEl = getTooltipHost(node);
			const inPopover = hostEl !== document.body;

			tooltipEl = document.createElement('div');
			textEl = document.createElement('span');
			textEl.textContent = content;
			arrowEl = document.createElement('div');

			Object.assign(tooltipEl.style, {
				position: inPopover ? 'absolute' : 'fixed',
				zIndex: '1',
				pointerEvents: 'none',
				opacity: '0',
				transition: 'opacity 0.15s ease',
				left: '0',
				top: '0',
				width: 'max-content'
			});

			Object.assign(textEl.style, {
				display: 'block',
				padding: '4px 8px',
				fontSize: '11px',
				fontWeight: '500',
				color: '#fff',
				backgroundColor: '#333',
				borderRadius: '4px',
				whiteSpace: 'nowrap'
			});

			Object.assign(arrowEl.style, {
				position: 'absolute',
				width: '6px',
				height: '6px',
				backgroundColor: '#333',
				transform: 'rotate(45deg)',
				zIndex: '-1'
			});

			tooltipEl.appendChild(textEl);
			tooltipEl.appendChild(arrowEl);
			hostEl.appendChild(tooltipEl);
			updatePosition();
			cleanup = autoUpdate(node, tooltipEl, updatePosition);
		}, 150);
	}

	function hide() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
		if (cleanup) {
			cleanup();
			cleanup = null;
		}
		if (tooltipEl) {
			tooltipEl.remove();
			tooltipEl = null;
			textEl = null;
			arrowEl = null;
			hostEl = null;
		}
	}

	node.addEventListener('mouseenter', show);
	node.addEventListener('mouseleave', hide);
	node.addEventListener('mousedown', hide);
	node.addEventListener('click', hide);

	return {
		update(newContent: string) {
			content = newContent;
			if (textEl) textEl.textContent = content;
		},
		destroy() {
			hide();
			node.removeEventListener('mouseenter', show);
			node.removeEventListener('mouseleave', hide);
			node.removeEventListener('mousedown', hide);
			node.removeEventListener('click', hide);
		}
	};
}
