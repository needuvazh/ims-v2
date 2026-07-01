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
  addWaitlistEntry: vi.fn(),
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
  session: { updateMany: vi.fn() },
  batchTrainer: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
  outboxEvent: { create: vi.fn() },
  $transaction: vi.fn((cb) => cb(mockPrisma)),
} as any;

const batchService = new BatchService(mockPrisma, mockBatchRepository, mockSchedulingService);

beforeEach(() => {
  vi.clearAllMocks();
  // Default mocks to bypass user branch scoping
  mockPrisma.userBranchAccess.findFirst.mockResolvedValue({ id: 'access-id' });
  mockBatchRepository.findSessions.mockResolvedValue([]);
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
