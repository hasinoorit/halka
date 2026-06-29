export function scrollIntoView(node: HTMLElement) {
	node.scrollIntoView({
		behavior: 'smooth',
		block: 'nearest'
	});
}
