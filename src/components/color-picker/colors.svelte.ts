export interface ColorItem {
	id: string;
	name: string;
	slug: string;
	value: string;
	isDefault?: boolean;
}

function createId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `color-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class ColorStore {
	palette: ColorItem[] = $state([
		{ id: createId(), name: 'Brand', slug: 'brand', value: '#3B82F6', isDefault: true },
		{ id: createId(), name: 'Primary', slug: 'primary', value: '#1F2937', isDefault: true },
		{ id: createId(), name: 'Secondary', slug: 'secondary', value: '#4B5563', isDefault: true },
		{ id: createId(), name: 'Success', slug: 'success', value: '#22C55E', isDefault: true },
		{ id: createId(), name: 'Info', slug: 'info', value: '#0EA5E9', isDefault: true },
		{ id: createId(), name: 'Error', slug: 'error', value: '#EF4444', isDefault: true },
		{ id: createId(), name: 'Warning', slug: 'warning', value: '#F59E0B', isDefault: true },
		{ id: createId(), name: 'White', slug: 'white', value: '#FFFFFF', isDefault: true },
		{ id: createId(), name: 'Black', slug: 'black', value: '#000000', isDefault: true }
	]);

	private targetDocs: Document[] = $state([]);

	constructor() {
		if (typeof window !== 'undefined') {
			this.targetDocs.push(document);
			$effect.root(() => {
				$effect(() => {
					const style = this.getStyleString();
					this.targetDocs.forEach((doc) => this.applyToDoc(doc, style));
				});
			});
		}
	}

	registerDocument(doc: Document) {
		if (!this.targetDocs.includes(doc)) {
			this.targetDocs.push(doc);
			this.applyToDoc(doc, this.getStyleString());
		}
	}

	unregisterDocument(doc: Document) {
		this.targetDocs = this.targetDocs.filter((d) => d !== doc);
	}

	isNameUnique(name: string, excludeId?: string): boolean {
		return !this.palette.some(
			(c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== excludeId
		);
	}

	isSlugUnique(slug: string, excludeId?: string): boolean {
		return !this.palette.some(
			(c) => c.slug.trim().toLowerCase() === slug.trim().toLowerCase() && c.id !== excludeId
		);
	}

	addColor(name: string, value: string, slug?: string) {
		if (!name.trim() || !value.trim()) return false;
		if (!this.isNameUnique(name)) return false;

		const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
		let alphanumSlug = finalSlug.replace(/[^a-z0-9-]/g, '');

		let counter = 1;
		const originalSlug = alphanumSlug;
		while (!this.isSlugUnique(alphanumSlug)) {
			alphanumSlug = `${originalSlug}-${counter++}`;
		}

		this.palette.push({
			id: createId(),
			name: name.trim(),
			slug: alphanumSlug,
			value: value.trim()
		});
		return true;
	}

	removeColor(id: string) {
		const color = this.palette.find((c) => c.id === id);
		if (color?.isDefault) return;
		this.palette = this.palette.filter((c) => c.id !== id);
	}

	updateColor(id: string, updates: Partial<Pick<ColorItem, 'name' | 'value' | 'slug'>>) {
		const color = this.palette.find((c) => c.id === id);
		if (!color) return false;

		if (updates.name !== undefined) {
			const trimmedName = updates.name.trim();
			if (!trimmedName) return false;
			if (!this.isNameUnique(trimmedName, id)) return false;
			if (color.isDefault) return false;
			color.name = trimmedName;
		}

		if (updates.value !== undefined) {
			const trimmedValue = updates.value.trim();
			if (!trimmedValue) return false;
			color.value = trimmedValue;
		}

		if (updates.slug !== undefined && !color.isDefault) {
			const alphanumSlug = updates.slug.replace(/[^a-z0-9-]/g, '');
			if (!alphanumSlug) return false;
			if (!this.isSlugUnique(alphanumSlug, id)) return false;
			color.slug = alphanumSlug;
		}
		return true;
	}

	resolveColor(val: string): string {
		if (!val) return 'transparent';
		if (typeof val !== 'string') return val;

		if (val.startsWith('var(--colors-')) {
			const slug = val.match(/var\(--colors-([^)]+)\)/)?.[1];
			if (slug) {
				const color = this.palette.find((c) => c.slug === slug);
				return color ? color.value : 'transparent';
			}
		}
		return val;
	}

	getStyleString(): string {
		const variables = this.palette.map((c) => `--colors-${c.slug}: ${c.value};`).join('\n');
		return `:root {\n${variables}\n}`;
	}

	private applyToDoc(doc: Document, styleString: string) {
		if (typeof window === 'undefined' || !doc) return;
		let styleEl = doc.getElementById('builder-colors');
		if (!styleEl) {
			styleEl = doc.createElement('style');
			styleEl.id = 'builder-colors';
			doc.head.appendChild(styleEl);
		}
		styleEl.textContent = styleString;
	}

	injectStyles(targetDoc: Document = document) {
		this.applyToDoc(targetDoc, this.getStyleString());
	}
}

export const colorStore = new ColorStore();
