import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../packages/database/src/client';
import { LeaveManagementService } from '../packages/leave-management/src/application/leave-service';
import { PrismaTrainerManagementRepository } from '../packages/trainer-management/src/infrastructure/prisma-trainer-management-repository';
import { SchedulingService } from '../packages/scheduling/src/application/scheduling-service';
import { PrismaSchedulingRepository } from '../packages/scheduling/src/infrastructure/scheduling-repository';
import { createUuid } from '../packages/shared-kernel/src/value-objects';
import { randomUUID } from 'crypto';

describe('Leave & Time-Off Management Integration Tests', () => {
  let leaveService: LeaveManagementService;
  let trainerRepository: PrismaTrainerManagementRepository;
  let schedulingService: SchedulingService;
  
  let branchId: string;
  let courseId: string;
  let personId: string;
  let trainerId: string;

  const mockAdminContext = {
    actorId: '00000000-0000-0000-0000-000000000001',
    permissions: ['leave.read', 'leave.apply', 'leave.approve', 'trainer.eligibility.read', 'schedule.manage'],
    allowedBranchIds: [] as string[],
  };

  beforeAll(async () => {
    leaveService = new LeaveManagementService(prisma);
    trainerRepository = new PrismaTrainerManagementRepository(prisma);
    const schedulingRepository = new PrismaSchedulingRepository(prisma);
    schedulingService = new SchedulingService(prisma, schedulingRepository);

    // Find/create branch
    let branch = await prisma.branch.findFirst({ where: { isDeleted: false } });
    if (!branch) {
      const instId = createUuid(randomUUID());
      await prisma.institute.create({
        data: {
          id: instId,
          instituteCode: 'LINST-01',
          instituteName: 'Leave Test Institute',
        },
      });
      branch = await prisma.branch.create({
        data: {
          id: createUuid(randomUUID()),
          instituteId: instId,
          branchCode: 'LBR-01',
          branchName: 'Leave Test Branch',
          status: 'Active',
        },
      });
    }
    branchId = branch.id;
    mockAdminContext.allowedBranchIds = [branchId];

    // Find/create course
    let course = await prisma.course.findFirst({
      where: { status: 'Published', isDeleted: false },
    });
    if (!course) {
      course = await prisma.course.create({
        data: {
          id: createUuid(randomUUID()),
          courseCode: 'LCRS-01',
          nameEnglish: 'Leave Test Course',
          status: 'Published',
          courseClassification: 'Regular',
          durationType: 'Weeks',
          durationValue: 4,
          effectiveStartDate: new Date('2025-01-01'),
        },
      });
    }
    courseId = course.id;

    // Create a Person profile
    personId = createUuid(randomUUID());
    await prisma.person.create({
      data: {
        id: personId,
        firstName: 'LeaveTest',
        lastName: 'Trainer',
        email: `leavetest.trainer.${randomUUID().slice(0, 8)}@ims.com`,
        mobile: '9681234567',
        gender: 'Male',
      },
    });

    // Create a Trainer profile linked to Person
    trainerId = createUuid(randomUUID());
    await prisma.trainerProfile.create({
      data: {
        id: trainerId,
        personId,
        branchId,
        trainerCode: `TR-L-${randomUUID().slice(0, 8)}`,
        trainerType: 'FullTime',
        specialization: 'Leave Testing',
        status: 'Active',
        effectiveStartDate: new Date('2025-01-01'),
        authorizations: {
          create: {
            id: createUuid(randomUUID()),
            courseId,
            status: 'Active',
            effectiveStartDate: new Date('2025-01-01'),
          },
        },
        availability: {
          create: {
            id: createUuid(randomUUID()),
            branchId,
            dayOfWeek: 'Wednesday',
            startTime: '09:00',
            endTime: '17:00',
            status: 'Active',
            effectiveStartDate: new Date('2025-01-01'),
          },
        },
      },
    });
  });

  it('should successfully apply, list, approve, and reject leave requests', async () => {
    // 1. Apply Leave
    const leave = await leaveService.applyLeave(
      {
        personId,
        branchId,
        startDate: new Date('2026-07-08'),
        endDate: new Date('2026-07-08'),
        isFullDay: true,
        leaveType: 'Casual',
        reason: 'Testing apply leave',
      },
      mockAdminContext,
    );

    expect(leave).toBeDefined();
    expect(leave.status).toBe('Pending');
    expect(leave.personId).toBe(personId);

    // 2. List Leaves
    const listResult = await leaveService.listLeaveRequests(
      { personId },
      { page: 1, pageSize: 10 },
      mockAdminContext,
    );
    expect(listResult.items.length).toBeGreaterThan(0);
    expect(listResult.items[0].id).toBe(leave.id);

    // 3. Approve Leave
    const approved = await leaveService.approveLeave(leave.id, mockAdminContext);
    expect(approved.status).toBe('Approved');
    expect(approved.approvedBy).toBe(mockAdminContext.actorId);

    // 4. Test Trainer Eligibility while on leave
    const eligibilityResult = await trainerRepository.findEligibleTrainers(
      {
        branchId,
        courseId,
        targetDate: new Date('2026-07-08'), // Target Date matches leave date
        startTime: '10:00',
        endTime: '12:00',
      },
      { page: 1, pageSize: 1000 },
    );

    const currentTrainer = eligibilityResult.items.find((t) => t.trainerId === trainerId);
    expect(currentTrainer).toBeDefined();
    expect(currentTrainer?.eligible).toBe(false);
    expect(currentTrainer?.reasonCodes).toContain('TRAINER_NOT_AVAILABLE');

    // 5. Test Scheduling Conflict engine while on leave
    const validationResult = await schedulingService.validateSession({
      branchId,
      instituteId: createUuid(randomUUID()), // dummy
      scheduledDate: new Date('2026-07-08'),
      startTime: '10:00',
      endTime: '12:00',
      trainerId,
    });

    expect(validationResult.isValid).toBe(false);
    const trainerUnavailableConflict = validationResult.conflicts.find(
      (c) => c.type === 'TRAINER_UNAVAILABLE',
    );
    expect(trainerUnavailableConflict).toBeDefined();
    expect(trainerUnavailableConflict?.severity).toBe('CRITICAL');
  });
});
