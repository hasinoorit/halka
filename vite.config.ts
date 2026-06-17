import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		alias: [
			{
				find: /^halka\/plugins\/(.+)$/,
				replacement: path.resolve(__dirname, 'src/lib/plugins/$1.ts')
			},
			{ find: 'halka', replacement: path.resolve(__dirname, 'src/lib/index.ts') }
		]
	},
	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'client',

					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},

					include: ['src/tests/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'jsdom',
					include: ['src/tests/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/tests/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
