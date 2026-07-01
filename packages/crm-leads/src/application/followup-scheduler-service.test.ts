import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FollowUpSchedulerService } from './followup-scheduler-service';
import { PrismaClient } from '@prisma/client';

describe('FollowUpSchedulerService', () => {
  let service: FollowUpSchedulerService;
  let mockPrisma: any;
  let mockFollowUpRepo: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const tx = {
          leadNote: { create: vi.fn() },
          leadFollowUp: { update: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      }),
    };

    mockFollowUpRepo = {
      findAllScheduledOverdue: vi.fn(),
      findById: vi.fn(),
    };

    service = new FollowUpSchedulerService(mockPrisma as unknown as PrismaClient, mockFollowUpRepo);
  });

  it('should process no records if none are overdue', async () => {
    mockFollowUpRepo.findAllScheduledOverdue.mockResolvedValue([]);
    const result = await service.processOverdueFollowUps();
    expect(result.processedCount).toBe(0);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('should process overdue records and update status and create notes', async () => {
    mockFollowUpRepo.findAllScheduledOverdue.mockResolvedValue([
      { id: 'f1', leadId: 'l1', followUpType: 'Call', lead: { branchId: 'b1' } },
      { id: 'f2', leadId: 'l2', followUpType: 'Email', lead: { branchId: 'b1' } },
    ]);

    mockFollowUpRepo.findById.mockResolvedValue({ status: 'Scheduled', lead: { branchId: 'b1' } });

    const result = await service.processOverdueFollowUps();
    expect(result.processedCount).toBe(2);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('should skip records if their status changed concurrently', async () => {
    mockFollowUpRepo.findAllScheduledOverdue.mockResolvedValue([
      { id: 'f1', leadId: 'l1', followUpType: 'Call', lead: { branchId: 'b1' } },
    ]);

    // Mock it as already completed in the transaction
    mockFollowUpRepo.findById.mockResolvedValue({ status: 'Completed', lead: { branchId: 'b1' } });

    const result = await service.processOverdueFollowUps();
    // It skips the update part, so transaction finishes but no processed count is incremented?
    // Wait, my code currently only increments if it didn't return early.
    expect(result.processedCount).toBe(0);
  });
});
