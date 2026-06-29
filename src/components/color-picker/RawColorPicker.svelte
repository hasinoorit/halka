<script lang="ts">
	import { hsbToRgb, rgbToHsb } from './color-utils';
	import { colorStore } from './colors.svelte';

	let {
		value = '',
		onchange,
		class: className = ''
	}: {
		value?: string;
		onchange: (val: string) => void;
		class?: string;
	} = $props();

	let hue = $state(0);
	let saturation = $state(100);
	let brightness = $state(100);
	let alpha = $state(100);

	const currentHex = $derived.by(() => {
		const { r, g, b } = hsbToRgb(hue, saturation, brightness);
		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	});

	const currentColor = $derived.by(() => {
		if (alpha >= 100) return currentHex;
		const { r, g, b } = hsbToRgb(hue, saturation, brightness);
		return `rgba(${r}, ${g}, ${b}, ${(alpha / 100).toFixed(2)})`;
	});

	function parseColor(color: string) {
		if (!color) {
			hue = 0;
			saturation = 0;
			brightness = 100;
			alpha = 100;
			return;
		}

		const resolved = colorStore.resolveColor(color);

		if (resolved.startsWith('#')) {
			const hex =
				resolved.length === 4
					? `#${resolved[1]}${resolved[1]}${resolved[2]}${resolved[2]}${resolved[3]}${resolved[3]}`
					: resolved;
			const r = parseInt(hex.substring(1, 3), 16);
			const g = parseInt(hex.substring(3, 5), 16);
			const b = parseInt(hex.substring(5, 7), 16);

			const hsb = rgbToHsb(r, g, b);
			hue = hsb.h;
			saturation = hsb.s;
			brightness = hsb.b;
			alpha = 100;
		} else if (resolved.startsWith('rgba') || resolved.startsWith('rgb')) {
			const match = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
			if (match) {
				const r = parseInt(match[1]);
				const g = parseInt(match[2]);
				const b = parseInt(match[3]);
				const a = match[4] ? parseFloat(match[4]) : 1;

				const hsb = rgbToHsb(r, g, b);
				hue = hsb.h;
				saturation = hsb.s;
				brightness = hsb.b;
				alpha = a * 100;
			}
		}
	}

	let gradientPickerEl = $state<HTMLElement>();
	let isDraggingGradient = $state(false);
	let lastEmittedColor = '';

	function colorsMatch(a: string, b: string): boolean {
		if (a === b) return true;
		return colorStore.resolveColor(a).toLowerCase() === colorStore.resolveColor(b).toLowerCase();
	}

	$effect(() => {
		if (lastEmittedColor && colorsMatch(value, lastEmittedColor)) return;
		parseColor(value);
		lastEmittedColor = '';
	});

	function triggerChange() {
		lastEmittedColor = currentColor;
		onchange(currentColor);
	}

	function handleGradientPointerDown(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingGradient = true;
		updateGradientFromEvent(e);
		gradientPickerEl?.setPointerCapture(e.pointerId);
	}

	function handleGradientPointerMove(e: PointerEvent) {
		if (!isDraggingGradient) return;
		e.preventDefault();
		e.stopPropagation();
		updateGradientFromEvent(e);
	}

	function handleGradientPointerUp(e: PointerEvent) {
		if (!isDraggingGradient) return;
		e.preventDefault();
		isDraggingGradient = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleGradientPointerCancel(e: PointerEvent) {
		isDraggingGradient = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function stopSliderPointerBubble(event: PointerEvent) {
		event.stopPropagation();
	}

	function updateGradientFromEvent(e: PointerEvent) {
		if (!gradientPickerEl) return;

		const rect = gradientPickerEl.getBoundingClientRect();
		const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

		saturation = (x / rect.width) * 100;
		brightness = 100 - (y / rect.height) * 100;
		triggerChange();
	}

	const hueColor = $derived(`hsl(${hue}, 100%, 50%)`);
</script>

<div class="raw-picker {className}">
	<div
		bind:this={gradientPickerEl}
		class="raw-picker__gradient"
		style="background: linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, {hueColor});"
		onpointerdown={handleGradientPointerDown}
		onpointermove={handleGradientPointerMove}
		onpointerup={handleGradientPointerUp}
		onpointercancel={handleGradientPointerCancel}
		role="slider"
		tabindex="0"
		aria-label="Color saturation and brightness"
		aria-valuenow={saturation}
	>
		<div
			class="raw-picker__indicator"
			style="left: {saturation}%; top: {100 - brightness}%; background-color: {currentHex};"
		></div>
	</div>

	<div class="raw-picker__slider-wrap">
		<input
			type="range"
			min="0"
			max="360"
			bind:value={hue}
			oninput={triggerChange}
			onpointerdown={stopSliderPointerBubble}
			class="raw-picker__slider raw-picker__slider--hue"
			aria-label="Hue"
		/>
	</div>

	<div class="raw-picker__slider-wrap">
		<input
			type="range"
			min="0"
			max="100"
			bind:value={alpha}
			oninput={triggerChange}
			onpointerdown={stopSliderPointerBubble}
			class="raw-picker__slider raw-picker__slider--alpha"
			aria-label="Opacity"
			style="background: linear-gradient(to right, transparent, {currentHex}), url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHJlY3Qgd2lkdGg9IjUiIGhlaWdodD0iNSIgZmlsbD0iI2NjYyIvPjxyZWN0IHg9IjUiIHk9IjUiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IiNjY2MiLz48L3N2Zz4=');"
		/>
	</div>

	<div class="raw-picker__footer">
		<div class="raw-picker__preview">
			<div class="raw-picker__preview-fill" style="background-color: {currentColor};"></div>
		</div>

		<div class="raw-picker__field raw-picker__field--grow">
			<label for="raw-hex" class="raw-picker__label">HEX</label>
			<input id="raw-hex" type="text" value={currentHex.toUpperCase()} class="raw-picker__input" readonly />
		</div>

		<div class="raw-picker__field">
			<label for="raw-alpha" class="raw-picker__label">%</label>
			<input
				id="raw-alpha"
				type="number"
				min="0"
				max="100"
				bind:value={alpha}
				oninput={triggerChange}
				class="raw-picker__input raw-picker__input--alpha"
			/>
		</div>
	</div>
</div>

<style>
	.raw-picker {
		display: flex;
		flex-direction: column;
		gap: 4px;
		user-select: none;
		-webkit-user-select: none;
	}

	.raw-picker__gradient {
		position: relative;
		width: 100%;
		aspect-ratio: 5/3;
		border-radius: 6px;
		cursor: crosshair;
		touch-action: none;

	}

	.raw-picker__indicator {
		position: absolute;
		width: 14px;
		height: 14px;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(15 23 42 / 0.2);
		pointer-events: none;
		transform: translate(-50%, -50%);
	}

	.raw-picker__slider-wrap {
		display: flex;
		align-items: center;
		min-height: 25px;
		padding: 6px 0;
		touch-action: none;
	}

	.raw-picker__slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 10px;
		margin: 0;
		border-radius: 999px;
		outline: none;
		cursor: pointer;
		border: none;
		background: transparent;
	}

	.raw-picker__slider--hue::-webkit-slider-runnable-track {
		height: 10px;
		border-radius: 999px;
		border: none;
		background: linear-gradient(
			to right,
			#ff0000,
			#ffff00,
			#00ff00,
			#00ffff,
			#0000ff,
			#ff00ff,
			#ff0000
		);
	}

	.raw-picker__slider--hue::-moz-range-track {
		height: 10px;
		border-radius: 999px;
		border: none;
		background: linear-gradient(
			to right,
			#ff0000,
			#ffff00,
			#00ff00,
			#00ffff,
			#0000ff,
			#ff00ff,
			#ff0000
		);
	}

	.raw-picker__slider::-webkit-slider-runnable-track {
		height: 10px;
		border-radius: 999px;
		border: none;
	}

	.raw-picker__slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		margin-top: -4px;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgb(15 23 42 / 0.22);
		background: rgb(15 23 42 / 0.18);
	}

	.raw-picker__slider::-moz-range-track {
		height: 10px;
		border-radius: 999px;
		border: none;
	}

	.raw-picker__slider--alpha::-moz-range-track {
		background: transparent;
	}

	.raw-picker__slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgb(15 23 42 / 0.22);
		background: rgb(15 23 42 / 0.18);
	}

	@media (pointer: coarse) {
		.raw-picker__indicator {
			width: 17px;
			height: 17px;
		}

		.raw-picker__slider-wrap {
			min-height: 25px;
			padding: 0;
		}

		.raw-picker__slider::-webkit-slider-thumb {
			width: 22px;
			height: 22px;
			margin-top: -6px;
		}

		.raw-picker__slider::-moz-range-thumb {
			width: 22px;
			height: 22px;
		}
	}

	.raw-picker__footer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
	}

	.raw-picker__preview {
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		border-radius: 5px;
		border: 1px solid #e2e8f0;
		background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wIDBoNHY0SDB6bTQgNGg0djRINHoiIGZpbGw9IiNjY2MiLz48L3N2Zz4=");
		overflow: hidden;
	}

	.raw-picker__preview-fill {
		width: 100%;
		height: 100%;
	}

	.raw-picker__field {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.raw-picker__label {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #94a3b8;
	}

	.raw-picker__input {
		padding: 3px 6px;
		font-family: ui-monospace, monospace;
		font-size: 10px;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		outline: none;
		background: #fff;
		width: 4rem;
	}

	.raw-picker__input:focus {
		border-color: #94a3b8;
	}

	.raw-picker__input--alpha {
		width: 3.5rem;
		text-align: right;
	}
</style>
