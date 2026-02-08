import { describe, it, expect, beforeEach } from 'vitest';
import { Schema, defaultSchema } from '../../lib/core/schema.js';

describe('Schema', () => {
	describe('defaultSchema', () => {
		it('should contain common block tags', () => {
			expect(defaultSchema.blocks.has('P')).toBe(true);
			expect(defaultSchema.blocks.has('DIV')).toBe(true);
			expect(defaultSchema.blocks.has('H1')).toBe(true);
			expect(defaultSchema.blocks.has('UL')).toBe(true);
			expect(defaultSchema.blocks.has('OL')).toBe(true);
			expect(defaultSchema.blocks.has('LI')).toBe(true);
		});

		it('should contain common inline tags', () => {
			expect(defaultSchema.inlines.has('SPAN')).toBe(true);
			expect(defaultSchema.inlines.has('A')).toBe(true);
			expect(defaultSchema.inlines.has('STRONG')).toBe(true);
			expect(defaultSchema.inlines.has('EM')).toBe(true);
		});

		it('should contain common void tags', () => {
			expect(defaultSchema.voids.has('IMG')).toBe(true);
			expect(defaultSchema.voids.has('BR')).toBe(true);
			expect(defaultSchema.voids.has('HR')).toBe(true);
		});
	});

	describe('Schema methods', () => {
		let schema: Schema;

		beforeEach(() => {
			schema = new Schema();
		});

		it('should identify block tags', () => {
			expect(schema.isBlock('P')).toBe(true);
			expect(schema.isBlock('p')).toBe(true); // case-insensitive
			expect(schema.isBlock('DIV')).toBe(true);
			expect(schema.isBlock('SPAN')).toBe(false);
		});

		it('should identify inline tags', () => {
			expect(schema.isInline('SPAN')).toBe(true);
			expect(schema.isInline('span')).toBe(true); // case-insensitive
			expect(schema.isInline('STRONG')).toBe(true);
			expect(schema.isInline('P')).toBe(false);
		});

		it('should identify void tags', () => {
			expect(schema.isVoid('IMG')).toBe(true);
			expect(schema.isVoid('img')).toBe(true); // case-insensitive
			expect(schema.isVoid('BR')).toBe(true);
			expect(schema.isVoid('P')).toBe(false);
		});

		it('should identify block nodes', () => {
			const p = document.createElement('p');
			const span = document.createElement('span');
			const text = document.createTextNode('text');

			expect(schema.isBlockNode(p)).toBe(true);
			expect(schema.isBlockNode(span)).toBe(false);
			expect(schema.isBlockNode(text)).toBe(false);
		});

		it('should identify inline nodes', () => {
			const span = document.createElement('span');
			const p = document.createElement('p');
			const text = document.createTextNode('text');

			expect(schema.isInlineNode(span)).toBe(true);
			expect(schema.isInlineNode(p)).toBe(false);
			expect(schema.isInlineNode(text)).toBe(false);
		});

		it('should identify void nodes', () => {
			const img = document.createElement('img');
			const p = document.createElement('p');
			const text = document.createTextNode('text');

			expect(schema.isVoidNode(img)).toBe(true);
			expect(schema.isVoidNode(p)).toBe(false);
			expect(schema.isVoidNode(text)).toBe(false);
		});
	});
});
