import { expect, test } from '@playwright/test';

const routes = [
	{ path: '/', heading: 'Halka Editor' },
	{ path: '/demo', heading: 'Interactive demo' },
	{ path: '/docs', heading: 'Documentation' },
	{ path: '/docs/core', heading: 'Core API' },
	{ path: '/docs/svelte-ui', heading: 'Svelte UI components' },
	{ path: '/docs/plugins/find-replace', heading: 'Find & replace' }
];

for (const { path, heading } of routes) {
	test(`route ${path} renders`, async ({ page }) => {
		await page.goto(path);
		await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
	});
}
