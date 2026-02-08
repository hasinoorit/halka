import { describe, it, expect } from 'vitest';
import {
	isTextNode,
	isElementNode,
	isOnlyChild,
	isEmpty,
	isReadonlyElement,
	isInsideReadonly,
	getParentElements,
	getParentElementsUntil,
	copyPasteChildNodes,
	wrapOutWith,
	wrapInWith,
	unwrap,
	getClosestBlockElement,
	isMergeable,
	mergeNodes,
	mergeAdjacentChildren
} from '../../lib/helpers/node.js';

describe('node helpers', () => {
	it('detects text and element nodes', () => {
		const text = document.createTextNode('hello');
		const div = document.createElement('div');

		expect(isTextNode(text)).toBe(true);
		expect(isTextNode(div)).toBe(false);
		expect(isElementNode(div)).toBe(true);
		expect(isElementNode(text)).toBe(false);
	});

	it('checks only child', () => {
		const parent = document.createElement('div');
		const child = document.createElement('span');
		parent.appendChild(child);

		expect(isOnlyChild(child)).toBe(true);

		const second = document.createElement('span');
		parent.appendChild(second);

		expect(isOnlyChild(child)).toBe(false);
	});

	it('wraps node with outer wrapper and unwraps', () => {
		const parent = document.createElement('div');
		const child = document.createElement('span');
		parent.appendChild(child);

		const wrapper = document.createElement('strong');
		wrapOutWith(child, wrapper);

		expect(parent.firstChild).toBe(wrapper);
		expect(wrapper.firstChild).toBe(child);

		unwrap(wrapper);

		expect(parent.firstChild).toBe(child);
		expect(child.parentElement).toBe(parent);
	});

	it('wraps children inside element', () => {
		const el = document.createElement('p');
		const text = document.createTextNode('hello');
		el.appendChild(text);

		const wrapper = document.createElement('em');
		wrapInWith(el, wrapper);

		expect(el.firstChild).toBe(wrapper);
		expect(wrapper.firstChild).toBe(text);
	});

	it('recognises empty and non-empty trees', () => {
		const root = document.createElement('div');
		root.appendChild(document.createTextNode('   '));

		const inner = document.createElement('span');
		inner.appendChild(document.createTextNode('\n'));
		root.appendChild(inner);

		expect(isEmpty(root)).toBe(true);

		inner.appendChild(document.createTextNode('x'));

		expect(isEmpty(root)).toBe(false);
	});

	it('computes parent elements and parent elements until', () => {
		const root = document.createElement('div');
		const mid = document.createElement('section');
		const leaf = document.createElement('span');

		root.appendChild(mid);
		mid.appendChild(leaf);

		const parents = getParentElements(leaf);
		expect(parents[0]).toBe(leaf);
		expect(parents[1]).toBe(mid);
		expect(parents[2]).toBe(root);

		const untilMid = getParentElementsUntil(leaf, mid);
		expect(untilMid[0]).toBe(leaf);
		expect(untilMid.includes(mid)).toBe(false);
	});

	it('copies and pastes child nodes between containers', () => {
		const source = document.createElement('div');
		const target = document.createElement('div');

		const first = document.createElement('span');
		const second = document.createElement('b');

		source.appendChild(first);
		source.appendChild(second);

		const result = copyPasteChildNodes(target, source);

		expect(result).toBe(target);
		expect(target.childNodes.length).toBe(2);
		expect(target.childNodes[0]).toBe(first);
		expect(target.childNodes[1]).toBe(second);
		expect(source.childNodes.length).toBe(0);
	});

	it('detects readonly elements and nodes inside readonly containers', () => {
		const readonly = document.createElement('div');
		readonly.setAttribute('data-readonly', 'true');

		const child = document.createElement('span');
		const innerText = document.createTextNode('value');

		child.appendChild(innerText);
		readonly.appendChild(child);

		expect(isReadonlyElement(readonly)).toBe(true);
		expect(isReadonlyElement(child)).toBe(false);

		expect(isInsideReadonly(innerText)).toBe(true);
		expect(isInsideReadonly(child)).toBe(true);

		const outside = document.createElement('p');
		outside.appendChild(document.createTextNode('outside'));

		expect(isInsideReadonly(outside)).toBe(false);
	});

	it('finds the closest block-level ancestor within a root', () => {
		const root = document.createElement('div');
		const inline = document.createElement('span');
		const block = document.createElement('p');
		const text = document.createTextNode('hello');

		root.appendChild(block);
		block.appendChild(inline);
		inline.appendChild(text);

		document.body.appendChild(root);

		const closest = getClosestBlockElement(text, root);
		expect(closest).toBe(block);

		document.body.removeChild(root);
	});

	it('identifies mergeable nodes', () => {
		const t1 = document.createTextNode('a');
		const t2 = document.createTextNode('b');
		const s1 = document.createElement('strong');
		const s2 = document.createElement('strong');
		const em = document.createElement('em');

		expect(isMergeable(t1, t2)).toBe(true);
		expect(isMergeable(s1, s2)).toBe(true);
		expect(isMergeable(s1, em)).toBe(false);

		s1.style.color = 'red';
		expect(isMergeable(s1, s2)).toBe(false);
		s2.style.color = 'red';
		expect(isMergeable(s1, s2)).toBe(true);

		const td1 = document.createElement('td');
		const td2 = document.createElement('td');
		expect(isMergeable(td1, td2)).toBe(false);
	});

	it('merges nodes', () => {
		const parent = document.createElement('div');
		const t1 = document.createTextNode('Hello ');
		const t2 = document.createTextNode('World');
		parent.appendChild(t1);
		parent.appendChild(t2);

		mergeNodes(t1, t2);
		expect(parent.childNodes.length).toBe(1);
		expect(parent.textContent).toBe('Hello World');

		const s1 = document.createElement('strong');
		s1.textContent = 'bold';
		const s2 = document.createElement('strong');
		s2.textContent = 'text';
		parent.innerHTML = '';
		parent.appendChild(s1);
		parent.appendChild(s2);

		mergeNodes(s1, s2);
		expect(parent.childNodes.length).toBe(1);
		expect(parent.firstChild?.textContent).toBe('boldtext');
	});

	it('merges adjacent children recursively', () => {
		const parent = document.createElement('div');
		parent.innerHTML = '<strong>a</strong><strong>b</strong><em>c</em><em>d</em>';

		mergeAdjacentChildren(parent);

		expect(parent.childNodes.length).toBe(2);
		expect(parent.innerHTML).toBe('<strong>ab</strong><em>cd</em>');

		parent.innerHTML = '<div><strong>a</strong><strong>b</strong></div><div><strong>c</strong></div>';
		mergeAdjacentChildren(parent);
		// Divs are blocks, so they DON'T merge. But their children DO.
		expect(parent.childNodes.length).toBe(2);
		expect(parent.querySelector('div')?.innerHTML).toBe('<strong>ab</strong>');
	});
});
