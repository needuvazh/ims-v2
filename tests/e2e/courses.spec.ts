import { test, expect } from '@playwright/test';

async function login(page: any, email: string) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email').fill(email);
  await page.getByTestId('sign-in-password').fill('Password@123');
  await page.getByTestId('sign-in-submit').click();
  await page.waitForURL('**/dashboard');
}

test.describe('Course Catalog UI Flow', () => {
  test('Branch Manager can list, create, and edit courses', async ({ page }) => {
    // 1. Log in
    await login(page, 'manager.riyadh@ims.com');

    // 2. Navigate to Course Catalog page
    await page.goto('/courses-catalog');

    // Verify page header title
    await expect(page.locator('h1')).toContainText('Course Catalog');

    // Verify KPI cards are visible
    await expect(page.getByText('Total Courses')).toBeVisible();
    await expect(page.getByText('Published Courses')).toBeVisible();

    // Verify some seeded data is present (e.g. CS-SE01 or similar)
    await expect(page.locator('table')).toBeVisible();

    // 3. Navigate to Create Course form
    await page.getByRole('button', { name: 'Create Course' }).click();
    await page.waitForURL('**/courses-catalog/new');

    await expect(page.locator('h1')).toContainText('Create Course');

    // 4. Fill in the course details
    const uniqueCode = `CS-E2E-${Math.floor(1000 + Math.random() * 9000)}`;
    await page.locator('input[name="courseCode"]').fill(uniqueCode);
    
    // Select first department option
    await page.getByRole('button', { name: 'Select department' }).click();
    await page.locator('div.cursor-pointer', { hasText: 'Information Technology' }).click();
    
    await page.locator('input[name="nameEnglish"]').fill('Playwright Test Course');
    await page.locator('input[name="nameArabic"]').fill('دورة اختبار بلاي رايت');
    await page.locator('textarea[name="descriptionEnglish"]').fill('E2E automation course for testing.');
    await page.locator('textarea[name="descriptionArabic"]').fill('دورة آلية للاختبارات الكاملة.');

    // Select category and classification
    await page.getByRole('button', { name: 'Select category (Optional)' }).click();
    await page.locator('div.cursor-pointer', { hasText: 'Technology & Engineering' }).click();

    await page.getByRole('button', { name: 'Regular (Open Batches)' }).click();
    await page.locator('div.cursor-pointer', { hasText: 'Regular (Open Batches)' }).click();

    await page.getByRole('button', { name: 'Weeks' }).click();
    await page.locator('div.cursor-pointer', { hasText: 'Weeks' }).click();
    await page.locator('input[name="durationValue"]').fill('10');
    
    await page.locator('input[name="effectiveStartDate"]').fill('2026-07-02');

    // Submit form
    await page.getByRole('button', { name: 'Create Course Template' }).click();

    // 5. Verify redirection and creation
    await page.waitForURL('**/courses-catalog');
    await expect(page.getByText('Course created successfully!')).toBeVisible();

    // Verify the new course is visible in the list table
    await expect(page.getByText(uniqueCode)).toBeVisible();

    // 6. Navigate to Edit Course page
    await page.locator(`tr:has-text("${uniqueCode}")`).getByRole('button', { title: 'Edit Course' }).click();
    await page.waitForURL(/\/courses-catalog\/.*\/edit/);

    await expect(page.locator('h1')).toContainText('Edit Course');
    await expect(page.locator('input[name="courseCode"]')).toBeDisabled();

    // Update English title
    await page.locator('input[name="nameEnglish"]').fill('Playwright Test Course (Updated)');

    // Save
    await page.getByRole('button', { name: 'Update Course Template' }).click();

    // Verify success and redirection
    await page.waitForURL('**/courses-catalog');
    await expect(page.getByText('Course updated successfully!')).toBeVisible();
    await expect(page.getByText('Playwright Test Course (Updated)')).toBeVisible();
  });
});
