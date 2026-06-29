<script lang="ts" module>
	export type ColorPickerTriggerProps = {
		toggle: () => void;
		isOpen: boolean;
		displayColor: string;
		displayLabel: string;
		isInherited: boolean;
		value: string;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { computePosition, offset, shift, autoUpdate, flip } from '@floating-ui/dom';
	import { colorStore } from './colors.svelte';
	import RawColorPicker from './RawColorPicker.svelte';
	import { tooltip } from './tooltip.svelte';
	import { scrollIntoView } from './scroll-into-view.js';
	import IconSettings from './icons/IconSettings.svelte';
	import IconReset from './icons/IconReset.svelte';
	import IconChevronLeft from './icons/IconChevronLeft.svelte';
	import IconEdit from './icons/IconEdit.svelte';
	import IconTrash from './icons/IconTrash.svelte';
	import IconPlus from './icons/IconPlus.svelte';

	let {
		value,
		onchange,
		inheritedValue,
		onReset,
		children
	}: {
		value: string;
		onchange: (val: string) => void;
		inheritedValue?: string;
		onReset?: () => void;
		children?: Snippet<[ColorPickerTriggerProps]>;
	} = $props();

	let isOpen = $state(false);
	let triggerEl = $state<HTMLElement>();
	let popupEl = $state<HTMLDivElement>();
	let cleanup: (() => void) | undefined;

	function close() {
		isOpen = false;
	}

	function hidePopoverIfOpen(el: HTMLDivElement | undefined) {
		if (el?.matches(':popover-open')) {
			el.hidePopover();
		}
	}

	function updatePosition() {
		if (!triggerEl || !popupEl) return;
		computePosition(triggerEl, popupEl, {
			placement: 'bottom-start',
			strategy: 'fixed',
			middleware: [offset(6), flip(), shift({ padding: 10, mainAxis: true, crossAxis: true })]
		}).then(({ x, y }) => {
			if (!popupEl) return;
			Object.assign(popupEl.style, {
				position: 'fixed',
				inset: 'unset',
				left: `${x}px`,
				top: `${y}px`,
				margin: '0'
			});
		});
	}

	$effect(() => {
		if (!isOpen || !triggerEl || !popupEl) {
			hidePopoverIfOpen(popupEl);
			cleanup?.();
			cleanup = undefined;
			return;
		}

		void tick().then(() => {
			if (popupEl && isOpen && !popupEl.matches(':popover-open')) {
				popupEl.showPopover();
				updatePosition();
			}
		});

		cleanup = autoUpdate(triggerEl, popupEl, updatePosition);

		return () => {
			cleanup?.();
			cleanup = undefined;
			hidePopoverIfOpen(popupEl);
		};
	});

	function handleClickOutside(event: MouseEvent) {
		if (
			isOpen &&
			!popupEl?.contains(event.target as Node) &&
			!triggerEl?.contains(event.target as Node)
		) {
			close();
		}
	}

	$effect(() => {
		if (isOpen) {
			window.addEventListener('click', handleClickOutside);
		} else {
			window.removeEventListener('click', handleClickOutside);
		}
		return () => window.removeEventListener('click', handleClickOutside);
	});

	function selectPaletteColor(slug: string) {
		onchange(`var(--colors-${slug})`);
		close();
	}

	function clearColor() {
		onReset?.();
		close();
	}

	let isManaging = $state(false);
	let editingId = $state<string | null>(null);
	let isAdding = $state(false);

	let editName = $state('');
	let editSlug = $state('');
	let editValue = $state('');

	const isEditNameUnique = $derived(colorStore.isNameUnique(editName, editingId || undefined));
	const isEditValid = $derived(
		editName.trim() !== '' && editValue.trim() !== '' && isEditNameUnique
	);

	function startEditing(color: (typeof colorStore.palette)[number]) {
		isAdding = false;
		editingId = color.id;
		editName = color.name;
		editSlug = color.slug;
		editValue = color.value;
	}

	function startAdding() {
		editingId = null;
		isAdding = true;
		editName = '';
		editSlug = '';
		editValue = '#3B82F6';
	}

	function saveEdit() {
		if (!isEditValid) return;

		if (isAdding) {
			colorStore.addColor(editName, editValue);
			isAdding = false;
		} else if (editingId) {
			colorStore.updateColor(editingId, {
				name: editName,
				slug: editSlug,
				value: editValue
			});
			editingId = null;
		}
	}

	const resolvedValue = $derived(colorStore.resolveColor(value));
	const resolvedInherited = $derived(colorStore.resolveColor(inheritedValue || ''));
	const displayColor = $derived(resolvedValue || resolvedInherited || 'transparent');
	const isInherited = $derived(!value && !!inheritedValue);

	const displayLabel = $derived.by(() => {
		if (!value) {
			return inheritedValue ? 'Inherited' : 'None';
		}
		if (value.startsWith('var(--colors-')) {
			const slug = value.match(/var\(--colors-([^)]+)\)/)?.[1];
			const color = colorStore.palette.find((item) => item.slug === slug);
			return color?.name ?? slug ?? 'Theme';
		}
		if (value.length > 12) {
			return value.slice(0, 11) + '…';
		}
		return value;
	});

	function toggle() {
		isOpen = !isOpen;
	}

	const triggerProps = $derived({
		toggle,
		isOpen,
		displayColor,
		displayLabel,
		isInherited,
		value
	} satisfies ColorPickerTriggerProps);
</script>

<div class="cp">
	<div class="cp__trigger-row">
		{#if children}
			<div class="cp__trigger-anchor" bind:this={triggerEl}>
				{@render children(triggerProps)}
			</div>
		{:else}
			<button
				bind:this={triggerEl}
				type="button"
				class="cp__trigger"
				title={value || inheritedValue || 'Pick a color'}
				onclick={toggle}
			>
				<div
					class="cp__swatch"
					class:cp__swatch--inherited={isInherited}
					style:background-color={displayColor}
				>
					{#if !value && !inheritedValue}
						<div class="cp__swatch-empty"></div>
					{/if}
				</div>
				<span class="cp__value" class:cp__value--inherited={isInherited}>{displayLabel}</span>
				<svg
					class="cp__chevron"
					class:cp__chevron--open={isOpen}
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</button>
		{/if}

		{#if onReset && value !== undefined && value !== null}
			<button
				type="button"
				class="cp__reset"
				title="Reset to inherited value"
				onclick={(e) => {
					e.stopPropagation();
					onReset();
				}}
			>
				<IconReset size={12} />
			</button>
		{/if}
	</div>

	{#if isOpen}
		<div bind:this={popupEl} popover="manual" class="cp__popup">
			<div class="cp__popup-inner">
				{#if isManaging}
					<div class="cp__manage">
						<div class="cp__manage-header">
							<button
								type="button"
								class="cp__back"
								onclick={(e) => {
									e.stopPropagation();
									isManaging = false;
									editingId = null;
								}}
							>
								<IconChevronLeft size={14} />
								Back
							</button>
							<span class="cp__manage-title">Manage Colors</span>
						</div>

						<div class="cp__manage-list">
							{#each colorStore.palette as color (color.id)}
								<div class="cp__color-item">
									{#if editingId === color.id}
										<div class="cp__edit-form" use:scrollIntoView>
											<span class="cp__form-heading">Edit Color</span>

											<RawColorPicker
												value={editValue}
												onchange={(val: string) => {
													editValue = val;
												}}
											/>

											<div class="cp__fields">
												<div class="cp__field">
													<label for="color-edit-name" class="cp__label">Name</label>
													<input
														id="color-edit-name"
														type="text"
														bind:value={editName}
														placeholder="Name"
														disabled={color.isDefault}
														class="cp__input"
														class:cp__input--error={!isEditNameUnique && !!editName}
													/>
													{#if !isEditNameUnique && editName}
														<span class="cp__error">Name must be unique</span>
													{/if}
												</div>

												<div class="cp__field-row">
													<div class="cp__field">
														<label for="color-edit-slug" class="cp__label">Slug</label>
														<input
															id="color-edit-slug"
															type="text"
															bind:value={editSlug}
															placeholder="slug"
															disabled={color.isDefault}
															class="cp__input cp__input--mono"
														/>
													</div>
													<div class="cp__field">
														<label for="color-edit-value" class="cp__label">Value</label>
														<input
															id="color-edit-value"
															type="text"
															bind:value={editValue}
															placeholder="#000"
															class="cp__input cp__input--mono"
														/>
													</div>
												</div>
											</div>

											<div class="cp__actions">
												<button
													type="button"
													class="cp__btn cp__btn--ghost"
													onclick={(e) => {
														e.stopPropagation();
														editingId = null;
													}}
												>
													Cancel
												</button>
												<button
													type="button"
													disabled={!isEditValid}
													class="cp__btn cp__btn--primary"
													onclick={(e) => {
														e.stopPropagation();
														saveEdit();
													}}
												>
													Save
												</button>
											</div>
										</div>
									{:else}
										<div class="cp__color-row">
											<div class="cp__color-info">
												<div class="cp__color-preview" style:background-color={color.value}></div>
												<div class="cp__color-meta">
													<span class="cp__color-name">{color.name}</span>
												</div>
											</div>
											<div class="cp__color-actions">
												<button
													type="button"
													class="cp__icon-btn"
													use:tooltip={'Edit color'}
													onclick={(e) => {
														e.stopPropagation();
														startEditing(color);
													}}
												>
													<IconEdit size={12} />
												</button>
												{#if !color.isDefault}
													<button
														type="button"
														class="cp__icon-btn cp__icon-btn--danger"
														use:tooltip={'Delete color'}
														onclick={(e) => {
															e.stopPropagation();
															colorStore.removeColor(color.id);
														}}
													>
														<IconTrash size={12} />
													</button>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/each}

							{#if isAdding}
								<div class="cp__color-item">
									<div class="cp__edit-form" use:scrollIntoView>
										<span class="cp__form-heading">New Color</span>

										<RawColorPicker
											value={editValue}
											onchange={(val: string) => {
												editValue = val;
											}}
										/>

										<div class="cp__fields">
											<div class="cp__field">
												<label for="new-color-name" class="cp__label">Name</label>
												<input
													id="new-color-name"
													type="text"
													bind:value={editName}
													placeholder="e.g. Brand Blue"
													class="cp__input"
													class:cp__input--error={!isEditNameUnique && !!editName}
												/>
												{#if !isEditNameUnique && editName}
													<span class="cp__error">Name must be unique</span>
												{/if}
											</div>
											<div class="cp__field">
												<label for="new-color-value" class="cp__label">Value</label>
												<input
													id="new-color-value"
													type="text"
													bind:value={editValue}
													placeholder="#000"
													class="cp__input cp__input--mono"
												/>
											</div>
										</div>

										<div class="cp__actions">
											<button
												type="button"
												class="cp__btn cp__btn--ghost"
												onclick={(e) => {
													e.stopPropagation();
													isAdding = false;
												}}
											>
												Cancel
											</button>
											<button
												type="button"
												disabled={!isEditValid}
												class="cp__btn cp__btn--primary"
												onclick={(e) => {
													e.stopPropagation();
													saveEdit();
												}}
											>
												Add
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<div class="cp__manage-footer">
							<button
								type="button"
								class="cp__add-btn"
								onclick={(e) => {
									e.stopPropagation();
									startAdding();
								}}
							>
								<IconPlus size={14} />
								Add New Color
							</button>
						</div>
					</div>
				{:else}
					<div class="cp__select">
						<RawColorPicker {value} {onchange} />

						<div class="cp__palette-header">
							<span class="cp__palette-title">Theme</span>
							<button
								type="button"
								class="cp__icon-btn"
								use:tooltip={'Manage palette'}
								onclick={(e) => {
									e.stopPropagation();
									isManaging = true;
								}}
							>
								<IconSettings size={12} />
							</button>
						</div>

						<div class="cp__palette-grid">
							{#if onReset}
								<button
									type="button"
									class="cp__palette-swatch cp__palette-swatch--none"
									class:cp__palette-swatch--selected={!value}
									onclick={clearColor}
									use:tooltip={'None'}
									aria-label="None"
								>
									<span class="cp__palette-none-mark" aria-hidden="true"></span>
								</button>
							{/if}
							{#each colorStore.palette as color (color.id)}
								<button
									type="button"
									class="cp__palette-swatch"
									class:cp__palette-swatch--selected={value === `var(--colors-${color.slug})`}
									style:background-color={color.value}
									onclick={() => selectPaletteColor(color.slug)}
									use:tooltip={color.name}
								>
									{#if value === `var(--colors-${color.slug})`}
										<div
											class="cp__palette-dot"
											class:cp__palette-dot--dark={color.slug === 'white' || color.slug === 'light'}
										></div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.cp {
		position: relative;
		display: inline-block;
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 12px;
		color: #334155;
	}

	.cp__trigger-row {
		display: flex;
		align-items: center;
		gap: 2px;
		min-width: 0;
	}

	.cp__trigger-anchor {
		display: inline-flex;
		min-width: 0;
	}

	.cp__trigger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		max-width: 100%;
		height: 28px;
		padding: 0 6px 0 4px;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		background: #fff;
		cursor: pointer;
		transition: border-color 0.15s, background-color 0.15s;
	}

	.cp__trigger:hover {
		border-color: #cbd5e1;
		background: #f8fafc;
	}

	.cp__swatch {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
		border-radius: 4px;
		border: 1px solid rgb(15 23 42 / 0.08);
		overflow: hidden;
	}

	.cp__swatch--inherited {
		border-style: dashed;
		opacity: 0.65;
	}

	.cp__swatch-empty {
		width: 100%;
		height: 100%;
		background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wIDBoNHY0SDB6bTQgNGg0djRINHoiIGZpbGw9IiNjY2MiLz48L3N2Zz4=");
		opacity: 0.25;
	}

	.cp__value {
		flex: 1;
		min-width: 0;
		font-size: 11px;
		font-weight: 500;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #475569;
	}

	.cp__value--inherited {
		color: #94a3b8;
		font-style: normal;
	}

	.cp__chevron {
		flex-shrink: 0;
		color: #94a3b8;
		transition: transform 0.15s;
	}

	.cp__chevron--open {
		transform: rotate(180deg);
	}

	.cp__reset {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: #94a3b8;
		cursor: pointer;
		transition: color 0.15s, background-color 0.15s;
	}

	.cp__reset:hover {
		background: #f1f5f9;
		color: #475569;
	}

	.cp__popup {
		position: fixed;
		inset: unset;
		margin: 0;
		padding: 0;
		width: 200px;
		max-height: min(calc(100dvh - 16px), 440px);
		display: flex;
		flex-direction: column;
		overflow: visible;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 10px 24px rgb(15 23 42 / 0.12);
	}

	.cp__popup:popover-open {
		display: flex;
	}

	.cp__popup-inner {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		border-radius: inherit;
	}

	.cp__select {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 0.75rem;
		overflow-y: auto;
		user-select: none;
		-webkit-user-select: none;
	}

	.cp__palette-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.cp__palette-title {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #94a3b8;
	}

	.cp__palette-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
	}

	.cp__palette-swatch {
		position: relative;
		aspect-ratio: 1;
		border: 1px solid rgb(15 23 42 / 0.06);
		border-radius: 4px;
		cursor: pointer;
		padding: 0;
		transition: box-shadow 0.12s, transform 0.12s;
	}

	.cp__palette-swatch:hover {
		transform: none;
		box-shadow: 0 0 0 1px rgb(15 23 42 / 0.12);
	}

	.cp__palette-swatch--selected {
		box-shadow: 0 0 0 2px #0f172a;
	}

	.cp__palette-swatch--none {
		background-color: #fff;
		background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wIDBoNHY0SDB6bTQgNGg0djRINHoiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=");
	}

	.cp__palette-none-mark {
		position: absolute;
		inset: 3px;
		border-radius: 2px;
		box-shadow: inset 0 0 0 1px rgb(15 23 42 / 0.08);
	}

	.cp__palette-none-mark::after {
		content: '';
		position: absolute;
		inset: 0;
		margin: auto;
		width: 120%;
		height: 1.5px;
		background: #ef4444;
		transform: rotate(-45deg);
		border-radius: 1px;
	}

	.cp__palette-dot {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 0 1px rgb(15 23 42 / 0.2);
	}

	.cp__palette-dot--dark {
		background: #0f172a;
		box-shadow: 0 0 0 1px #fff;
	}

	.cp__manage {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.cp__manage-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 6px 4px;
		flex-shrink: 0;
	}

	.cp__back {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 0;
		border: none;
		background: none;
		font-size: 11px;
		font-weight: 500;
		color: #64748b;
		cursor: pointer;
	}

	.cp__back:hover {
		color: #334155;
	}

	.cp__manage-title {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}

	.cp__manage-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 0 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.cp__color-item {
		padding: 4px 5px;
		border: 1px solid #f1f5f9;
		border-radius: 5px;
		background: #fafafa;
	}

	.cp__color-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.cp__color-info {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.cp__color-preview {
		width: 18px;
		height: 18px;
		border-radius: 3px;
		border: 1px solid rgb(15 23 42 / 0.06);
		flex-shrink: 0;
	}

	.cp__color-meta {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
	}

	.cp__color-name {
		font-size: 11px;
		font-weight: 600;
		color: #334155;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cp__color-actions {
		display: flex;
		gap: 0;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity 0.12s;
	}

	.cp__color-item:hover .cp__color-actions {
		opacity: 1;
	}

	.cp__icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		background: none;
		color: #94a3b8;
		cursor: pointer;
		border-radius: 4px;
	}

	.cp__icon-btn:hover {
		color: #334155;
		background: #f1f5f9;
	}

	.cp__icon-btn--danger:hover {
		color: #dc2626;
		background: #fef2f2;
	}

	.cp__edit-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.cp__form-heading {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}

	.cp__fields {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.cp__field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.cp__field {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.cp__label {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
	}

	.cp__input {
		padding: 4px 6px;
		font-size: 11px;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		outline: none;
		background: #fff;
	}

	.cp__input:focus {
		border-color: #94a3b8;
	}

	.cp__input:disabled {
		background: #f8fafc;
		color: #94a3b8;
	}

	.cp__input--mono {
		font-family: ui-monospace, monospace;
		font-size: 10px;
	}

	.cp__input--error {
		border-color: #fca5a5;
		background: #fef2f2;
	}

	.cp__error {
		font-size: 9px;
		font-weight: 500;
		color: #dc2626;
	}

	.cp__actions {
		display: flex;
		justify-content: flex-end;
		gap: 4px;
	}

	.cp__btn {
		padding: 4px 10px;
		font-size: 11px;
		font-weight: 500;
		border-radius: 4px;
		cursor: pointer;
		border: 1px solid transparent;
		transition: background 0.12s;
	}

	.cp__btn--ghost {
		background: #fff;
		border-color: #e2e8f0;
		color: #475569;
	}

	.cp__btn--ghost:hover {
		background: #f8fafc;
	}

	.cp__btn--primary {
		background: #0f172a;
		color: #fff;
	}

	.cp__btn--primary:hover:not(:disabled) {
		background: #1e293b;
	}

	.cp__btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.cp__manage-footer {
		padding: 4px 6px 6px;
		flex-shrink: 0;
	}

	.cp__add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		width: 100%;
		height: 28px;
		padding: 0 8px;
		border: 1px dashed #cbd5e1;
		border-radius: 6px;
		background: transparent;
		font-size: 11px;
		font-weight: 500;
		color: #475569;
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s;
	}

	.cp__add-btn:hover {
		background: #f8fafc;
		border-color: #94a3b8;
	}
</style>
