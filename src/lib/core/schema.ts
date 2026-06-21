/**
 * Schema system for Halka Editor
 * Defines valid HTML structure and element categorization
 */

export interface SchemaSpec {
	/** Block-level elements (can only be direct children of root) */
	blocks: Set<string>;
	/** Inline elements (can be inside blocks) */
	inlines: Set<string>;
	/** Void elements (self-closing, can't have children) */
	voids: Set<string>;
}

export const defaultSchema: SchemaSpec = {
	blocks: new Set([
		'P',
		'DIV',
		'H1',
		'H2',
		'H3',
		'H4',
		'H5',
		'H6',
		'UL',
		'OL',
		'LI',
		'BLOCKQUOTE',
		'PRE',
		'TABLE',
		'TBODY',
		'THEAD',
		'TR',
		'TD',
		'TH'
	]),
	inlines: new Set([
		'SPAN',
		'A',
		'STRONG',
		'B',
		'EM',
		'I',
		'U',
		'CODE',
		'MARK',
		'SUB',
		'SUP',
		'S',
		'STRIKE',
		'SMALL',
		'IMG'
	]),
	voids: new Set(['IMG', 'BR', 'HR', 'INPUT'])
};

export class Schema {
	constructor(public spec: SchemaSpec = defaultSchema) {}

	/**
	 * Check if a tag name is a block-level element
	 */
	isBlock(tagName: string): boolean {
		return this.spec.blocks.has(tagName.toUpperCase());
	}

	/**
	 * Check if a tag name is an inline element
	 */
	isInline(tagName: string): boolean {
		return this.spec.inlines.has(tagName.toUpperCase());
	}

	/**
	 * Check if a tag name is a void (self-closing) element
	 */
	isVoid(tagName: string): boolean {
		return this.spec.voids.has(tagName.toUpperCase());
	}

	/**
	 * Check if a node is a block element
	 */
	isBlockNode(node: Node): boolean {
		if (node.nodeType !== Node.ELEMENT_NODE) return false;
		return this.isBlock((node as Element).tagName);
	}

	/**
	 * Check if a node is an inline element
	 */
	isInlineNode(node: Node): boolean {
		if (node.nodeType !== Node.ELEMENT_NODE) return false;
		return this.isInline((node as Element).tagName);
	}

	/**
	 * Check if a node is a void element
	 */
	isVoidNode(node: Node): boolean {
		if (node.nodeType !== Node.ELEMENT_NODE) return false;
		return this.isVoid((node as Element).tagName);
	}
}
