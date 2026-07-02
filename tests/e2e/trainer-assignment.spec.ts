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

test.describe('Trainer Assignment & Conflict Validation UI Flow', () => {
  let batchId: string;
  let trainerId: string;
  let conflictingBatchId: string;

  test.beforeAll(async () => {
    // Setup seed data for E2E trainer conflict flow
    // Find active trainer, branch, course, classroom
    const branch = await prisma.branch.findFirst({ where: { isDeleted: false } });
    const course = await prisma.course.findFirst({ where: { status: 'Published', isDeleted: false } });
    const classroom = await prisma.classroom.findFirst({ where: { status: 'Active', isDeleted: false } });
    const trainerUser = await prisma.user.findFirst({
      where: {
        isDeleted: false,
        roles: {
          some: {
            role: {
              roleCode: 'TRAINER',
            },
          },
        },
      },
    });

    if (!branch || !course || !classroom || !trainerUser) {
      throw new Error('E2E database seed prerequisites missing.');
    }

    trainerId = trainerUser.id;

    // Create target batch (to assign trainer to)
    batchId = randomUUID();
    await prisma.batch.create({
      data: {
        id: batchId,
        courseId: course.id,
        branchId: branch.id,
        classroomId: classroom.id,
        batchCode: `B-E2E-A-${Math.floor(1000 + Math.random() * 9000)}`,
        batchNameEnglish: 'E2E Target Batch',
        batchNameArabic: 'دفعة الهدف E2E',
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: new Date('2026-11-30T00:00:00Z'),
        capacity: 20,
        status: 'Draft',
      },
    });

    // Create session in target batch on Nov 15th
    await prisma.session.create({
      data: {
        id: randomUUID(),
        batchId,
        sessionNumber: 1,
        titleEnglish: 'E2E Target Session',
        titleArabic: 'جلسة الهدف E2E',
        sessionDate: new Date('2026-11-15T00:00:00Z'),
        startTime: '10:00',
        endTime: '12:00',
        status: 'Scheduled',
      },
    });

    // Create conflicting batch
    conflictingBatchId = randomUUID();
    await prisma.batch.create({
      data: {
        id: conflictingBatchId,
        courseId: course.id,
        branchId: branch.id,
        classroomId: classroom.id,
        batchCode: `B-E2E-C-${Math.floor(1000 + Math.random() * 9000)}`,
        batchNameEnglish: 'E2E Conflicting Batch',
        batchNameArabic: 'دفعة التعارض E2E',
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: new Date('2026-11-30T00:00:00Z'),
        capacity: 20,
        status: 'Draft',
      },
    });

    // Create session in conflicting batch on Nov 15th (overlapping time 11:00-13:00)
    await prisma.session.create({
      data: {
        id: randomUUID(),
        batchId: conflictingBatchId,
        sessionNumber: 1,
        titleEnglish: 'E2E Conflicting Session',
        titleArabic: 'جلسة التعارض E2E',
        sessionDate: new Date('2026-11-15T00:00:00Z'),
        startTime: '11:00',
        endTime: '13:00',
        status: 'Scheduled',
      },
    });

    // Assign the trainer to the conflicting batch for Nov
    await prisma.batchTrainer.create({
      data: {
        id: randomUUID(),
        batchId: conflictingBatchId,
        trainerId,
        role: 'Primary',
        assignedFrom: new Date('2026-11-01T00:00:00Z'),
        assignedTo: new Date('2026-11-30T00:00:00Z'),
        status: 'Active',
      },
    });
  });

  test.afterAll(async () => {
    // Cleanup seed records
    await prisma.session.deleteMany({ where: { batchId: { in: [batchId, conflictingBatchId] } } });
    await prisma.batchTrainer.deleteMany({ where: { batchId: { in: [batchId, conflictingBatchId] } } });
    await prisma.batch.deleteMany({ where: { id: { in: [batchId, conflictingBatchId] } } });
  });

  test('Should block trainer assignment if schedule conflicts are detected', async ({ page }) => {

    // 1. Log in
    await login(page, 'manager.riyadh@ims.com');

    // 2. Go to the batch details page
    await page.goto(`/batches/${batchId}`);

    // 3. Navigate to Faculty tab
    await page.getByRole('button', { name: 'Faculty' }).click();

    // 4. Fill in Faculty Assignment form
    // Select the trainer with conflict
    await page.getByRole('button', { name: 'Select Trainer Profile' }).click();
    const trainerUser = await prisma.user.findUnique({
      where: { id: trainerId },
      select: { email: true }
    });
    await page.locator('span').filter({ hasText: trainerUser!.email }).click();

    // Set Dates
    await page.locator('input[type="date"]').first().fill('2026-11-01');
    await page.locator('input[type="date"]').last().fill('2026-11-30');

    // 5. Verify that the Conflict Alert and Overlap Grid is rendered
    const conflictAlert = page.getByText('Trainer has schedule conflicts in the following batches:');
    await expect(conflictAlert).toBeVisible();

    // Verify overlap details (batch code) is displayed
    const overlapBatchCell = page.locator('table').getByText(/B-E2E-C-/).first();
    await expect(overlapBatchCell).toBeVisible();

    // 6. Verify that the Assign Faculty button is disabled
    const assignBtn = page.getByRole('button', { name: 'Assign Faculty' });
    await expect(assignBtn).toBeDisabled();
  });
});
