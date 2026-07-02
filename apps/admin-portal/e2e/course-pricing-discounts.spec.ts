import { test, expect } from '@playwright/test';

test.describe('Course Pricing & Rules E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
    await page.goto('/login');
    await page.fill('input[name="email"]', 'coordinator@ims.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate to course edit page, switch to configurations tab, and add pricing override', async ({ page }) => {
    // Go to course catalog list
    await page.goto('/courses-catalog');
    await expect(page.locator('text=Course Catalog')).toBeVisible();

    // Click edit on the first course in the list
    const editLink = page.locator('a[href*="/edit"]').first();
    await editLink.click();
    await expect(page.locator('text=Catalog Template Details')).toBeVisible();

    // Toggle "Pricing, Discounts & Rules" tab
    await page.click('button:has-text("Pricing, Discounts & Rules")');
    await expect(page.locator('text=Fee Structure Overrides')).toBeVisible();

    // Click "Add Pricing Override" button
    await page.click('button:has-text("Add Pricing Override")');
    await expect(page.locator('text=Configure Pricing & Taxes')).toBeVisible();

    // Fill in Pricing form
    await page.selectOption('select[id="customerType"]', { label: 'Individual Student' });
    await page.selectOption('select[id="batchType"]', { label: 'Regular Sessions' });
    await page.fill('input[id="basePrice"]', '250.500');

    // Fill start date
    await page.fill('input[id="effectiveStartDate"]', '2026-08-01');

    // Submit
    await page.click('button:has-text("Submit Override")');

    // Verify success toast/closed modal
    await expect(page.locator('text=Configure Pricing & Taxes')).not.toBeVisible();
    await expect(page.locator('text=Pricing rule saved successfully')).toBeVisible();
  });
});
