import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../packages/database/src/client';
import { PrismaTrainerManagementRepository } from '../packages/trainer-management/src/infrastructure/prisma-trainer-management-repository';
import { createUuid } from '../packages/shared-kernel/src/value-objects';
import { randomUUID } from 'crypto';

describe('Trainer Eligibility Integration Tests', () => {
  let repository: PrismaTrainerManagementRepository;
  let branchId: string;
  let courseId: string;

  beforeAll(async () => {
    repository = new PrismaTrainerManagementRepository(prisma);

    // Find/create branch
    let branch = await prisma.branch.findFirst({ where: { isDeleted: false } });
    if (!branch) {
      const instId = createUuid(randomUUID());
      await prisma.institute.create({
        data: {
          id: instId,
          instituteCode: 'TINST-ELIG',
          instituteName: 'Test Inst for Eligibility',
        },
      });
      branch = await prisma.branch.create({
        data: {
          id: createUuid(randomUUID()),
          instituteId: instId,
          branchCode: 'TBR-ELIG',
          branchName: 'Test Branch for Eligibility',
          status: 'Active',
        },
      });
    }
    branchId = branch.id;

    // Find/create course
    let course = await prisma.course.findFirst({
      where: { status: 'Published', isDeleted: false },
    });
    if (!course) {
      course = await prisma.course.create({
        data: {
          id: createUuid(randomUUID()),
          courseCode: 'TCRS-ELIG',
          nameEnglish: 'Test Course for Eligibility',
          nameArabic: 'دورة التجربة',
          status: 'Published',
          courseClassification: 'Regular',
          durationType: 'Weeks',
          durationValue: 4,
          effectiveStartDate: new Date('2025-01-01'),
        },
      });
    }
    courseId = course.id;
  });

  const createTestTrainer = async (params: {
    trainerCode: string;
    effectiveStartDate: Date;
    effectiveEndDate: Date | null;
  }) => {
    const personId = createUuid(randomUUID());
    await prisma.person.create({
      data: {
        id: personId,
        firstName: 'Test',
        lastName: `Trainer ${params.trainerCode}`,
        mobile: `55500${Math.floor(10 + Math.random() * 89)}`,
        email: `trainer_${params.trainerCode}@test.com`,
      },
    });

    const trainerId = createUuid(randomUUID());
    const trainer = await prisma.trainerProfile.create({
      data: {
        id: trainerId,
        personId,
        branchId,
        trainerCode: params.trainerCode,
        trainerType: 'FullTime',
        specialization: 'General',
        status: 'Active',
        effectiveStartDate: params.effectiveStartDate,
        effectiveEndDate: params.effectiveEndDate,
      },
    });

    return trainer;
  };

  it('filters out trainers whose profile effective start date is in the future', async () => {
    const targetDate = new Date('2026-07-08');
    const futureStartDate = new Date('2026-08-01');
    const trainer = await createTestTrainer({
      trainerCode: `TRN-FUT-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveStartDate: futureStartDate,
      effectiveEndDate: null,
    });

    // Evaluate
    const result = await repository.findEligibleTrainers(
      {
        courseId,
        branchId,
        targetDate,
      },
      { page: 1, pageSize: 10 },
    );

    // Should not contain this trainer because effectiveStartDate > targetDate
    expect(result.items.some((item) => item.trainerId === trainer.id)).toBe(
      false,
    );
  });

  it('filters out trainers whose profile effective end date is in the past', async () => {
    const targetDate = new Date('2026-07-08');
    const pastEndDate = new Date('2026-06-30');
    const trainer = await createTestTrainer({
      trainerCode: `TRN-PAST-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveStartDate: new Date('2025-01-01'),
      effectiveEndDate: pastEndDate,
    });

    // Evaluate
    const result = await repository.findEligibleTrainers(
      {
        courseId,
        branchId,
        targetDate,
      },
      { page: 1, pageSize: 10 },
    );

    // Should not contain this trainer because effectiveEndDate < targetDate
    expect(result.items.some((item) => item.trainerId === trainer.id)).toBe(
      false,
    );
  });

  it('flags trainer as COURSE_NOT_AUTHORIZED and TRAINER_NOT_AVAILABLE if they lack both', async () => {
    const targetDate = new Date('2026-07-08'); // Wednesday
    const trainer = await createTestTrainer({
      trainerCode: `TRN-NONE-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveStartDate: new Date('2025-01-01'),
      effectiveEndDate: null,
    });

    // Evaluate
    const result = await repository.findEligibleTrainers(
      {
        courseId,
        branchId,
        targetDate,
      },
      { page: 1, pageSize: 1000 },
    );

    const match = result.items.find((item) => item.trainerId === trainer.id);
    expect(match).toBeDefined();
    expect(match?.eligible).toBe(false);
    expect(match?.reasonCodes).toContain('COURSE_NOT_AUTHORIZED');
    expect(match?.reasonCodes).toContain('TRAINER_NOT_AVAILABLE');
  });

  it('returns eligible: true when trainer has active auth and availability on targetDate', async () => {
    const targetDate = new Date('2026-07-08'); // Wednesday
    const trainer = await createTestTrainer({
      trainerCode: `TRN-OK-${Math.floor(1000 + Math.random() * 9000)}`,
      effectiveStartDate: new Date('2025-01-01'),
      effectiveEndDate: null,
    });

    // Create authorization
    await prisma.trainerCourseAuthorization.create({
      data: {
        id: createUuid(randomUUID()),
        trainerId: trainer.id,
        courseId,
        status: 'Active',
        effectiveStartDate: new Date('2025-01-01'),
        effectiveEndDate: null,
      },
    });

    // Create availability window for Wednesday
    await prisma.trainerAvailability.create({
      data: {
        id: createUuid(randomUUID()),
        trainerId: trainer.id,
        branchId,
        dayOfWeek: 'Wednesday',
        startTime: '09:00',
        endTime: '17:00',
        status: 'Active',
        effectiveStartDate: new Date('2025-01-01'),
        effectiveEndDate: null,
      },
    });

    // Evaluate
    const result = await repository.findEligibleTrainers(
      {
        courseId,
        branchId,
        targetDate,
        startTime: '10:00',
        endTime: '12:00',
      },
      { page: 1, pageSize: 1000 },
    );

    const match = result.items.find((item) => item.trainerId === trainer.id);
    expect(match).toBeDefined();
    expect(match?.eligible).toBe(true);
    expect(match?.reasonCodes).toHaveLength(0);
  });
});
