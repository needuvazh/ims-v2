import { expect, test, type Page } from '@playwright/test';

const viewportWidths = [375, 768, 1024, 1280, 1536] as const;

async function loginAsManager(page: Page) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email').fill('manager.riyadh@ims.com');
  await page.getByTestId('sign-in-password').fill('Password@123');
  await page.getByTestId('sign-in-submit').click();
  await page.waitForURL('**/dashboard');
}

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const element = document.documentElement;
    return {
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

test.describe('responsive layout system', () => {
  test('public home page stays within viewport bounds', async ({ page }) => {
    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(
        page.getByRole('link', { name: 'Browse Courses' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'About Us' })).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });

  test('admin shell adapts across the standard viewport set', async ({
    page,
  }) => {
    await loginAsManager(page);

    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/dashboard');
      await expect(page.getByTestId('dashboard-stats')).toBeVisible();

      const mobileSidebarButton = page.getByRole('button', {
        name: 'Open sidebar',
      });
      const searchButton = page.getByRole('button', {
        name: 'Search or jump to...',
      });
      if (width < 1024) {
        await expect(mobileSidebarButton).toBeVisible();
        await expect(searchButton).not.toBeVisible();
      } else {
        await expect(mobileSidebarButton).not.toBeVisible();
        await expect(
          page.locator('nav[aria-label="Primary navigation"]').first(),
        ).toBeVisible();
      }

      if (width >= 1280) {
        await expect(searchButton).toBeVisible();
      }

      await assertNoHorizontalOverflow(page);
    }
  });

  test('form pages stack cleanly on mobile and tablet widths', async ({
    page,
  }) => {
    await loginAsManager(page);

    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/leads/create');
      await expect(
        page.getByRole('heading', { name: 'Create Lead' }),
      ).toBeVisible();
      await expect(page.getByPlaceholder('Enter first name')).toBeVisible();
      await expect(page.getByPlaceholder('Enter last name')).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });
});
