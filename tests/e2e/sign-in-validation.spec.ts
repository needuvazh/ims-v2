import { expect, test } from '@playwright/test';

test('admin sign-in shows field-specific required messages', async ({ page }) => {
  await page.goto('/sign-in');

  await page.locator('button[type="button"]').click();
  await expect(page.getByTestId('sign-in-password')).toHaveAttribute('type', 'text');
  await page.locator('button[type="button"]').click();

  await page.getByTestId('sign-in-submit').click();

  await expect(page.getByText('Email Address is required.')).toBeVisible();

  await page.getByTestId('sign-in-email').fill('admin@ims.com');
  await page.getByTestId('sign-in-submit').click();

  await expect(page.getByText('Password is required.')).toBeVisible();
});
