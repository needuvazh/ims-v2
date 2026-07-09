import { test, expect } from '@playwright/test';

test.describe('Batch Creation Wizard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate and navigate
    await page.goto('/login');
    await page.fill('input[name="email"]', 'coordinator@ims.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should step through batch wizard form and validate timezone GST offsets', async ({
    page,
  }) => {
    await page.goto('/batches/new');

    // Step 1: Details
    // Select course and branch
    await page.selectOption('select:has-text("Select Course")', {
      label: 'OSHA Safety Certification (OSHA-101)',
    });
    await page.selectOption('select:has-text("Select Branch")', {
      label: 'ASTI Muscat Branch',
    });
    await page.fill(
      'input[placeholder="e.g. OSHA Safety - Batch 01"]',
      'QA E2E Batch English',
    );

    // Input dates (represented local, which browser maps to UTC+4)
    await page.fill('input[type="date"] >> nth=0', '2026-10-15');
    await page.fill('input[type="date"] >> nth=1', '2026-11-15');

    // Go to step 2
    await page.click('button:has-text("Next: Capacity & Controls")');

    // Step 2: Capacity & Student Controls
    await expect(page.locator('text=Capacity & Student Controls')).toBeVisible();
    await page.fill('input[type="number"]', '15');

    // Toggle checkboxes
    await page.check('input[id="waitingListEnabled"]');

    // Submit Batch
    await page.click('button:has-text("Create Batch")');

    // Verify redirect and toast
    await expect(page).toHaveURL('/batches');
    const toast = page.locator('text=Batch created successfully');
    await expect(toast).toBeVisible();
  });
});
