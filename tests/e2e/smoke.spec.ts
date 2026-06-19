import { test, expect } from '@playwright/test';

test('root workspace is not the app shell yet', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/IMS/i);
});
