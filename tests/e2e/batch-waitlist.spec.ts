import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function login(page: any, email: string) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email').fill(email);
  await page.getByTestId('sign-in-password').fill('Password@123');
  await page.getByTestId('sign-in-submit').click();
  await page.waitForURL('**/dashboard');
}

test.describe('Batch Waitlist Management UI Flow', () => {
  let batchId: string;
  let studentProfileId: string;
  let studentName: string;
  let personId: string;

  test.beforeAll(async () => {
    // Find Riyadh branch or any branch
    const branch = await prisma.branch.findFirst({
      where: { isDeleted: false },
    });
    if (!branch) throw new Error('E2E prerequisites missing: no branches found.');

    const course = await prisma.course.findFirst({
      where: { status: 'Published', isDeleted: false },
    });
    if (!course) throw new Error('E2E prerequisites missing: no published courses found.');

    // Create transient student profile & person
    personId = randomUUID();
    studentProfileId = randomUUID();
    studentName = 'E2E Waitlist Student';

    await prisma.person.create({
      data: {
        id: personId,
        firstName: 'E2E Waitlist',
        lastName: 'Student',
        mobile: `+96655${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `e2e-student-${Math.floor(1000000 + Math.random() * 9000000)}@asti.edu`,
      },
    });

    await prisma.studentProfile.create({
      data: {
        id: studentProfileId,
        personId: personId,
        studentNumber: `STU-E2E-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'Active',
      },
    });

    // Create batch with Riyadh branch ID
    batchId = randomUUID();
    await prisma.batch.create({
      data: {
        id: batchId,
        courseId: course.id,
        branchId: branch.id,
        batchCode: `B-E2E-W-${Math.floor(1000 + Math.random() * 9000)}`,
        batchNameEnglish: 'E2E Waitlist Batch',
        batchNameArabic: 'دفعة الانتظار E2E',
        startDate: new Date('2026-12-01T00:00:00Z'),
        endDate: new Date('2026-12-31T00:00:00Z'),
        capacity: 1,
        currentEnrollmentCount: 1,
        status: 'OpenForEnrollment',
      },
    });
  });

  test.afterAll(async () => {
    // Cleanup waitlist, batch, student profile, and person
    await prisma.waitingList.deleteMany({ where: { batchId } });
    await prisma.batch.deleteMany({ where: { id: batchId } });
    
    try {
      await prisma.studentProfile.delete({ where: { id: studentProfileId } });
      await prisma.person.delete({ where: { id: personId } });
    } catch (err) {
      console.warn('E2E cleanup warning:', err);
    }
  });

  test('Should support complete waitlist lifecycle: enqueue, skip, reactivate, remove', async ({ page }) => {
    // 1. Log in as Riyadh manager
    await login(page, 'manager.riyadh@ims.com');


    // 2. Go to the batch details page
    await page.goto(`/batches/${batchId}`);

    // 3. Click the Waiting List tab button
    await page.getByRole('button', { name: /Waiting List/i }).click();

    // 4. Select student and queue them
    await page.getByRole('button', { name: 'Select Student' }).first().click();
    await page.locator('span').filter({ hasText: studentName }).first().click();

    await page.getByRole('button', { name: 'Queue Candidate', exact: true }).click();

    // Verify successfully enqueued candidate name is displayed
    const nameCell = page.locator('table').getByText(studentName).first();
    await expect(nameCell).toBeVisible();

    // Verify queue position #1
    const posCell = page.locator('table').getByText('#1').first();
    await expect(posCell).toBeVisible();

    // 5. Skip candidate (sets to Held)
    // Setup dialog prompt answer before clicking skip button
    page.once('dialog', async (dialog) => {
      await dialog.accept('E2E Hold Reason');
    });
    await page.getByRole('button', { name: 'Skip' }).click();

    // Verify status Badge transitions to Held
    const heldBadge = page.locator('table').getByText('Held').first();
    await expect(heldBadge).toBeVisible();

    // Verify status reason is displayed
    const reasonCell = page.locator('table').getByText('E2E Hold Reason').first();
    await expect(reasonCell).toBeVisible();

    // 6. Reactivate candidate (sets back to Waiting)
    await page.getByRole('button', { name: 'Reactivate' }).click();

    // Verify status Badge transitions to Waiting
    const waitingBadge = page.locator('table').getByText('Waiting').first();
    await expect(waitingBadge).toBeVisible();

    // 7. Remove candidate
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Remove Candidate' }).first().click();

    // Verify table is empty
    const emptyText = page.getByText('Waiting list queue is currently empty.');
    await expect(emptyText).toBeVisible();
  });
});
