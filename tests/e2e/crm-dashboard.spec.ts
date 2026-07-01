import { test, expect } from '@playwright/test';

async function login(page: any, email: string) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email').fill(email);
  await page.getByTestId('sign-in-password').fill('Password@123');
  await page.getByTestId('sign-in-submit').click();
  await page.waitForURL('**/dashboard');
}

test.describe('CRM Analytics Dashboard UI', () => {
  test('Counselor should see personal metrics and no counselor performance chart', async ({ page }) => {
    await login(page, 'counselor.riyadh@ims.com');
    await page.goto('/dashboards/crm');

    // Verify page header
    await expect(page.locator('h1')).toHaveText('CRM Analytics Dashboard');

    // Verify widgets
    await expect(page.getByText('Lead Conversion Rate')).toBeVisible();
    await expect(page.getByText('Total Leads vs Targets')).toBeVisible();
    await expect(page.getByText('Leads by Stage')).toBeVisible();
    await expect(page.getByText('Leads by Source')).toBeVisible();

    // Counselor lacks REPORTING_VIEW_COUNSELOR_METRICS, so should not see Counselor Performance
    await expect(page.getByText('Counselor Performance')).not.toBeVisible();
  });

  test('Branch Manager should see counselor metrics chart and all widgets', async ({ page }) => {
    await login(page, 'manager.riyadh@ims.com');
    await page.goto('/dashboards/crm');

    // Verify page header
    await expect(page.locator('h1')).toHaveText('CRM Analytics Dashboard');

    // Verify widgets
    await expect(page.getByText('Lead Conversion Rate')).toBeVisible();
    await expect(page.getByText('Total Leads vs Targets')).toBeVisible();
    await expect(page.getByText('Leads by Stage')).toBeVisible();
    await expect(page.getByText('Leads by Source')).toBeVisible();

    // Branch Manager has REPORTING_VIEW_COUNSELOR_METRICS, so should see Counselor Performance
    await expect(page.getByText('Counselor Performance')).toBeVisible();
  });
});
