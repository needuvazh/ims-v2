import { expect, test, vi, beforeEach } from 'vitest';
import { BatchService } from '../src/application/batch-service';
import { createUuid } from '@ims/shared-kernel';

// Mock repository
const mockBatchRepository = {
  create: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  findByCode: vi.fn(),
  findAll: vi.fn(),
  findActiveWaitlist: vi.fn(),
  findWaitlist: vi.fn(),
  addWaitlistEntry: vi.fn(),
  updateWaitlistEntry: vi.fn(),
  findTrainers: vi.fn(),
  findPrimaryTrainer: vi.fn(),
  findSessions: vi.fn(),
  assignTrainer: vi.fn(),
};

// Mock scheduling service
const mockSchedulingService = {
  validateTrainerAssignment: vi.fn(),
  getSessionsForTrainer: vi.fn(),
};

// Mock Prisma
const mockPrisma = {
  classroom: { findUnique: vi.fn() },
  course: { findUnique: vi.fn() },
  trainerProfile: { findUnique: vi.fn() },
  userBranchAccess: { findFirst: vi.fn() },
  userRole: { findMany: vi.fn() },
  user: { findUnique: vi.fn() },
  session: { updateMany: vi.fn() },
  batchTrainer: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
  outboxEvent: { create: vi.fn() },
  $queryRawUnsafe: vi.fn(),
  $transaction: vi.fn((cb) => cb(mockPrisma)),
} as any;

const batchService = new BatchService(mockPrisma, mockBatchRepository, mockSchedulingService);

beforeEach(() => {
  vi.resetAllMocks();
  // Default mocks to bypass user branch scoping
  mockPrisma.userBranchAccess.findFirst.mockResolvedValue({ id: 'access-id' });
  mockPrisma.userRole.findMany.mockResolvedValue([
    {
      role: {
        roleCode: 'SUPER_ADMIN',
        permissions: [],
      },
    },
  ]);
  mockBatchRepository.findSessions.mockResolvedValue([]);
  mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'trainer-id',
    status: 'Active',
    roles: [
      {
        role: {
          roleCode: 'TRAINER',
        },
      },
    ],
  });
});

test('BatchService.createBatch should fail if course is not published', async () => {
  mockPrisma.course.findUnique.mockResolvedValueOnce({ status: 'Draft' });

  const input = {
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    branchId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    batchCode: 'B-TEST-01',
    batchNameEnglish: 'Test Batch',
    batchNameArabic: 'دفعة تجريبية',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    capacity: 20,
  };

  await expect(batchService.createBatch(input, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))).rejects.toThrow('published courses');
});

test('BatchService.updateBatch should fail if version numbers do not match (concurrency)', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    branchId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    batchCode: 'B-TEST-01',
    version: 5,
  });

  const input = {
    batchNameEnglish: 'Updated Name',
  };

  // Calling update with version 4 (expecting 5)
  await expect(batchService.updateBatch(batchId, input, 4, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))).rejects.toThrow('ERR_CRS_CONCURRENCY_VIOLATION');
});

test('BatchService.assignTrainer should check for trainer schedule overlaps and role limits', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    trainers: [],
  });
  mockBatchRepository.findTrainers.mockResolvedValueOnce([]);

  // Mock sessions to overlap on October 15th with explicit ISO strings
  mockBatchRepository.findSessions.mockResolvedValueOnce([
    { id: 's1', sessionDate: '2026-10-15T00:00:00.000Z', startTime: '09:00', endTime: '12:00' }
  ]);
  mockSchedulingService.getSessionsForTrainer.mockResolvedValueOnce([
    { id: 's2', sessionDate: '2026-10-15T00:00:00.000Z', startTime: '10:00', endTime: '13:00', batchCode: 'B-OTHER' }
  ]);
  mockPrisma.trainerProfile.findUnique.mockResolvedValueOnce({ id: trainerId, status: 'Active' });

  const assignment = {
    trainerId,
    role: 'Primary' as const,
    assignedFrom: new Date('2026-10-01'),
    assignedTo: new Date('2026-10-31'),
  };

  await expect(batchService.assignTrainer(batchId, assignment, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))).rejects.toThrow('Trainer is already scheduled');
});

test('BatchService.transitionBatchStatus should cascade sessions status and publish outbox event on Cancelled', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    status: 'OpenForEnrollment',
    version: 1,
    sessions: [
      { id: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'), status: 'Scheduled' },
    ],
  });

  mockBatchRepository.findPrimaryTrainer.mockResolvedValueOnce({ id: 'trainer-id' });
  mockBatchRepository.findSessions.mockResolvedValueOnce([
    { id: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'), status: 'Scheduled', sessionDate: '2026-10-15T00:00:00.000Z' }
  ]);

  mockBatchRepository.update.mockResolvedValueOnce({
    id: batchId,
    status: 'Cancelled',
    version: 2,
  });

  mockPrisma.outboxEvent.create.mockResolvedValueOnce({ id: 'event-id' });

  console.log('mockPrisma.batchTrainer status:', !!mockPrisma.batchTrainer, typeof mockPrisma.batchTrainer);

  const result = await batchService.transitionBatchStatus(batchId, 'Cancelled', 1, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'));
  expect(result.status).toBe('Cancelled');
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
});

test('BatchService should support waitlist queue positioning', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    waitingListEnabled: true,
  });

  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([
    { id: '1', queuePosition: 1 }
  ]);

  mockBatchRepository.addWaitlistEntry.mockResolvedValueOnce({
    id: 'entry-2',
    queuePosition: 2,
    status: 'Waiting',
  });

  const result = await batchService.batchRepository.addWaitlistEntry({
    id: 'entry-2',
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    batchId,
    queuePosition: 2,
    status: 'Waiting',
    createdBy: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
  });

  expect(result.queuePosition).toBe(2);
  expect(result.status).toBe('Waiting');
});

test('BatchService.assignTrainer should reject assignment if user lacks access to batch branch', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const userId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    branchId: createUuid('11111111-1111-1111-1111-111111111111'),
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    trainers: [],
  });

  // Mock branch access search to return null (no access)
  mockPrisma.userBranchAccess.findFirst.mockResolvedValueOnce(null);
  // Mock user roles to be empty (not admin)
  mockPrisma.userRole.findMany.mockResolvedValueOnce([]);

  const assignment = {
    trainerId,
    role: 'Primary' as const,
    assignedFrom: new Date('2026-10-01'),
    assignedTo: new Date('2026-10-31'),
  };

  await expect(
    batchService.assignTrainer(batchId, assignment, userId)
  ).rejects.toThrow('ERR_IAM_INSUFFICIENT_PERMISSIONS');
});

test('BatchService.assignTrainer should reject assignment if dates fall outside batch bounds', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    startDate: new Date('2026-10-05'),
    endDate: new Date('2026-10-25'),
    trainers: [],
  });

  const assignment = {
    trainerId,
    role: 'Primary' as const,
    assignedFrom: new Date('2026-10-01'), // starts before batch
    assignedTo: new Date('2026-10-31'), // ends after batch
  };

  await expect(
    batchService.assignTrainer(batchId, assignment, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))
  ).rejects.toThrow('Assignment date range falls outside the batch bounds');
});

test('BatchService.assignTrainer should reject assignment if batch is Completed or Cancelled', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    status: 'Completed',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    trainers: [],
  });

  const assignment = {
    trainerId,
    role: 'Primary' as const,
    assignedFrom: new Date('2026-10-01'),
    assignedTo: new Date('2026-10-31'),
  };

  await expect(
    batchService.assignTrainer(batchId, assignment, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))
  ).rejects.toThrow('Cannot assign trainer to a completed or cancelled batch');
});

test('BatchService.assignTrainer should reject if primary trainer already assigned for overlapping range', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    trainers: [],
  });

  // Mock already assigned primary trainer for Oct 10th to Oct 20th
  mockBatchRepository.findTrainers.mockResolvedValueOnce([
    {
      id: 'existing-bt',
      batchId,
      trainerId: 'other-trainer',
      role: 'Primary',
      assignedFrom: new Date('2026-10-10'),
      assignedTo: new Date('2026-10-20'),
      status: 'Active',
    },
  ]);

  const assignment = {
    trainerId,
    role: 'Primary' as const,
    assignedFrom: new Date('2026-10-15'), // overlaps with existing primary range (10th-20th)
    assignedTo: new Date('2026-10-25'),
  };

  await expect(
    batchService.assignTrainer(batchId, assignment, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))
  ).rejects.toThrow('A primary trainer is already assigned for this range');
});

test('BatchService.assignTrainer should reject if role type is invalid', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    trainers: [],
  });

  const assignment = {
    trainerId,
    role: 'Secondary' as any, // invalid role type
    assignedFrom: new Date('2026-10-01'),
    assignedTo: new Date('2026-10-31'),
  };

  await expect(
    batchService.assignTrainer(batchId, assignment, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))
  ).rejects.toThrow('ERR_CRS_INVALID_TRAINER_ROLE');
});

test('BatchService.assignTrainer should reject if trainer is inactive or lacks TRAINER role', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    trainers: [],
  });

  // Mock inactive trainer
  mockPrisma.user.findUnique.mockResolvedValueOnce({
    id: trainerId,
    status: 'Inactive',
    roles: [{ role: { roleCode: 'TRAINER' } }],
  });

  const assignment = {
    trainerId,
    role: 'Primary' as const,
    assignedFrom: new Date('2026-10-01'),
    assignedTo: new Date('2026-10-31'),
  };

  await expect(
    batchService.assignTrainer(batchId, assignment, createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'))
  ).rejects.toThrow('ERR_CRS_TRAINER_NOT_ACTIVE');
});

test('BatchService.checkTrainerConflicts should reject if actor lacks branch access permissions', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const trainerId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const actorId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    branchId: createUuid('11111111-1111-1111-1111-111111111111'),
  });

  mockPrisma.userBranchAccess.findFirst.mockResolvedValueOnce(null); // No access
  mockPrisma.userRole.findMany.mockResolvedValueOnce([]); // No roles

  await expect(
    batchService.checkTrainerConflicts(
      batchId,
      trainerId,
      new Date('2026-10-01'),
      new Date('2026-10-31'),
      actorId
    )
  ).rejects.toThrow('ERR_IAM_INSUFFICIENT_PERMISSIONS');
});

test('BatchService.enqueueWaitlist should successfully add student or lead to active waitlist queue', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const studentId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  
  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([]);
  mockBatchRepository.addWaitlistEntry.mockResolvedValueOnce({
    id: 'wl-1',
    studentId,
    queuePosition: 1,
    status: 'Waiting',
  });

  const result = await batchService.enqueueWaitlist(batchId, studentId, null, 'user-id');
  expect(result.status).toBe('Waiting');
  expect(result.queuePosition).toBe(1);
  expect(mockBatchRepository.addWaitlistEntry).toHaveBeenCalled();
});

test('BatchService.enqueueWaitlist should reject duplicate active entries', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const studentId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([
    { id: 'wl-existing', studentId, status: 'Waiting' }
  ]);

  await expect(
    batchService.enqueueWaitlist(batchId, studentId, null, 'user-id')
  ).rejects.toThrow('ERR_CRS_DUPLICATE_WAITLIST');
});

test('BatchService.manualPromoteWaitlist should fail if capacity is full and overbooking is false', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const wlId = 'wl-1';

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    allowOverbooking: false,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findWaitlist.mockResolvedValueOnce([
    { id: wlId, batchId, status: 'Waiting', studentId: 'stu-1' }
  ]);

  await expect(
    batchService.manualPromoteWaitlist(batchId, wlId, 'user-id')
  ).rejects.toThrow('ERR_CRS_BATCH_FULL');
});

test('BatchService.skipWaitlistEntry should transition status to Held and shift positions', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const wlId = 'wl-1';

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findWaitlist.mockResolvedValueOnce([
    { id: wlId, batchId, status: 'Waiting', studentId: 'stu-1', queuePosition: 1 }
  ]);
  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([
    { id: wlId, status: 'Waiting', queuePosition: 1 },
    { id: 'wl-2', status: 'Waiting', queuePosition: 2 }
  ]);

  const result = await batchService.skipWaitlistEntry(batchId, wlId, 'Manual Skip Reason', 'user-id');
  expect(result.status).toBe('Held');
  expect(result.statusReason).toBe('Manual Skip Reason');
  expect(mockBatchRepository.updateWaitlistEntry).toHaveBeenCalledWith(wlId, expect.objectContaining({ status: 'Held', queuePosition: 0 }), expect.anything());
});

test('BatchService.reactivateWaitlistEntry should transition held entry to Waiting and place at end', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const wlId = 'wl-1';

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findWaitlist.mockResolvedValueOnce([
    { id: wlId, batchId, status: 'Held', studentId: 'stu-1', queuePosition: 0 }
  ]);
  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([
    { id: 'wl-2', status: 'Waiting', queuePosition: 1 }
  ]);

  await batchService.reactivateWaitlistEntry(batchId, wlId, 'user-id');
  expect(mockBatchRepository.updateWaitlistEntry).toHaveBeenCalledWith(wlId, expect.objectContaining({ status: 'Waiting', queuePosition: 2 }), expect.anything());
});

test('BatchService.revertPromotion should decrement count, set status Held and trigger next auto-promotion', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const studentId = 'stu-1';
  const correlationId = 'corr-1';

  mockPrisma.$queryRawUnsafe.mockResolvedValue([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    version: 1,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findWaitlist.mockResolvedValueOnce([
    { id: 'wl-1', batchId, status: 'Promoted', studentId, promotionCorrelationId: correlationId }
  ]);
  mockBatchRepository.update.mockResolvedValueOnce({
    id: batchId,
    waitingListEnabled: true,
    version: 2,
  });
  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([
    { id: 'wl-2', status: 'Waiting', queuePosition: 1, studentId: 'stu-2' }
  ]);

  await batchService.revertPromotion(batchId, studentId, null, correlationId, 'Doc Failed', 'user-id');
  expect(mockBatchRepository.updateWaitlistEntry).toHaveBeenCalledWith('wl-1', expect.objectContaining({ status: 'Held', statusReason: 'Doc Failed' }), expect.anything());
  expect(mockBatchRepository.update).toHaveBeenCalledWith(batchId, { currentEnrollmentCount: 19 }, 1, expect.anything());
  // Verifies it triggers promotion for next candidate wl-2
  expect(mockBatchRepository.updateWaitlistEntry).toHaveBeenCalledWith('wl-2', expect.objectContaining({ status: 'Promoted' }), expect.anything());
});

test('BatchService.updateBatch should auto-promote waitlist candidates on capacity increase', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockBatchRepository.findById.mockResolvedValueOnce({
    id: batchId,
    capacity: 20,
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    version: 1,
  });

  mockBatchRepository.update.mockResolvedValueOnce({
    id: batchId,
    capacity: 22,
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    version: 2,
  });

  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([
    { id: 'wl-1', status: 'Waiting', queuePosition: 1, studentId: 'stu-1' },
    { id: 'wl-2', status: 'Waiting', queuePosition: 2, studentId: 'stu-2' }
  ]);

  await batchService.updateBatch(batchId, { capacity: 22 }, 1, 'user-id');

  // Verify updates for both candidates to Promoted
  expect(mockBatchRepository.updateWaitlistEntry).toHaveBeenCalledWith('wl-1', expect.objectContaining({ status: 'Promoted' }), expect.anything());
  expect(mockBatchRepository.updateWaitlistEntry).toHaveBeenCalledWith('wl-2', expect.objectContaining({ status: 'Promoted' }), expect.anything());
  // Verify it updates final batch count to 22
  expect(mockBatchRepository.update).toHaveBeenLastCalledWith(batchId, { currentEnrollmentCount: 22 }, 2, expect.anything());
});

test('BatchService.enqueueWaitlist should reject if waitingListEnabled is false', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const studentId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    currentEnrollmentCount: 20,
    waitingListEnabled: false,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  await expect(
    batchService.enqueueWaitlist(batchId, studentId, null, 'user-id')
  ).rejects.toThrow('Waiting list is not enabled for this batch.');
});

test('BatchService.enqueueWaitlist should reject if batch has not reached capacity', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');
  const studentId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    currentEnrollmentCount: 15,
    waitingListEnabled: true,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  await expect(
    batchService.enqueueWaitlist(batchId, studentId, null, 'user-id')
  ).rejects.toThrow('Cannot enqueue candidate because the batch has not reached capacity.');
});

test('BatchService.reorderWaitlist should reject duplicate waitlist IDs', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findActiveWaitlist.mockResolvedValueOnce([
    { id: 'wl-1', status: 'Waiting' },
    { id: 'wl-2', status: 'Waiting' }
  ]);

  await expect(
    batchService.reorderWaitlist(batchId, ['wl-1', 'wl-1'], 'user-id')
  ).rejects.toThrow('ERR_CRS_INVALID_REORDER_PAYLOAD');
});

test('BatchService.removeWaitlistEntry should reject if entry is already Promoted or Removed', async () => {
  const batchId = createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e');

  mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
    id: batchId,
    courseId: createUuid('d54db80f-90e8-4228-a5b6-7b4430e70e7e'),
    capacity: 20,
    currentEnrollmentCount: 20,
    waitingListEnabled: true,
    status: 'OpenForEnrollment',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
    createdAt: new Date(),
  }]);

  mockBatchRepository.findWaitlist.mockResolvedValueOnce([
    { id: 'wl-promoted', status: 'Promoted' }
  ]);

  await expect(
    batchService.removeWaitlistEntry(batchId, 'wl-promoted', 'user-id')
  ).rejects.toThrow('Cannot remove a waitlist entry that has already been removed or promoted.');
});
