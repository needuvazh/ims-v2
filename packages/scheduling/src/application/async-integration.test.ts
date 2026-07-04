/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchedulingService } from './scheduling-service';

describe('SchedulingService.processExternalCalendarChange (Async Integration)', () => {
  let service: SchedulingService;
  let mockPrisma: any;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      resolveCalendar: vi.fn(),
      listVenueBlocks: vi.fn().mockResolvedValue([]),
    };
    mockPrisma = {
      session: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      }
    };
    service = new SchedulingService(mockPrisma as any, mockRepo as any);
  });

  it('should flag sessions as Conflict when calendar change invalidates them', async () => {
    const branchId = 'b1';
    const date = new Date('2026-07-06');
    const instituteId = 'i1';

    // 1. Find sessions for that date
    mockPrisma.session.findMany.mockResolvedValue([
      { id: 's1', sessionDate: date, startTime: '09:00', endTime: '11:00', batchId: 'b1', batch: { branchId } }
    ]);

    // 2. Mock flagSessionConflicts internal calls
    mockPrisma.session.findUnique.mockResolvedValue({
      id: 's1', sessionDate: date, startTime: '09:00', endTime: '11:00', batchId: 'b1', batch: { branchId }
    });

    // 3. Mock validation to FAIL (e.g. Holiday detected)
    mockRepo.resolveCalendar.mockResolvedValue({
      holidays: [{ id: 'h1', status: 'Active', affectsScheduling: true, name: 'Eid' }],
      resolvedOperatingDays: []
    });

    await service.processExternalCalendarChange(branchId, date, instituteId);

    expect(mockPrisma.session.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: expect.objectContaining({
        scheduleStatus: 'Conflict',
        conflictType: 'HOLIDAY'
      })
    });
  });
});
