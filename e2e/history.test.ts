import { expect, test } from '@playwright/test';

test('demo editor undo restores typed content', async ({ page }) => {
	await page.goto('/demo');
	const editor = page.locator('[contenteditable="true"]').first();
	await editor.click();
	await editor.fill('');
	await editor.type('Hello');
	await page.waitForTimeout(5200);
	await editor.type(' World');
	await page.waitForTimeout(5200);

	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
	await expect(editor).toContainText('Hello');
	await expect(editor).not.toContainText('Hello World');
});
