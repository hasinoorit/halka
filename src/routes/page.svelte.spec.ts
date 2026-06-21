import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render landing page heading', async () => {
		render(Page);

		const heading = page.getByRole('heading', { name: 'Halka Editor', level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
