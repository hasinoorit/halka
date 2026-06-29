export function hsbToRgb(h: number, s: number, b: number): { r: number; g: number; b: number } {
	s /= 100;
	b /= 100;
	const c = b * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = b - c;

	let r = 0;
	let g = 0;
	let b2 = 0;

	if (h >= 0 && h < 60) {
		r = c;
		g = x;
		b2 = 0;
	} else if (h >= 60 && h < 120) {
		r = x;
		g = c;
		b2 = 0;
	} else if (h >= 120 && h < 180) {
		r = 0;
		g = c;
		b2 = x;
	} else if (h >= 180 && h < 240) {
		r = 0;
		g = x;
		b2 = c;
	} else if (h >= 240 && h < 300) {
		r = x;
		g = 0;
		b2 = c;
	} else {
		r = c;
		g = 0;
		b2 = x;
	}

	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b2 + m) * 255)
	};
}

export function rgbToHsb(r: number, g: number, b: number): { h: number; s: number; b: number } {
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	let h = 0;
	const s = max === 0 ? 0 : (delta / max) * 100;
	const br = max * 100;

	if (delta !== 0) {
		if (max === r) {
			h = 60 * (((g - b) / delta) % 6);
		} else if (max === g) {
			h = 60 * ((b - r) / delta + 2);
		} else {
			h = 60 * ((r - g) / delta + 4);
		}
	}

	if (h < 0) h += 360;

	return { h, s, b: br };
}
