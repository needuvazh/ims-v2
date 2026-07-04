/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchedulingService } from './scheduling-service';
import { ISchedulingRepository } from '../domain/repositories';

describe('ConflictEngine (SchedulingService.validateSession)', () => {
  let service: SchedulingService;
  let mockRepo: ISchedulingRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockRepo = {
      resolveCalendar: vi.fn(),
      listVenueBlocks: vi.fn().mockResolvedValue([]),
    } as any;
    mockPrisma = {
      session: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new SchedulingService(mockPrisma as any, mockRepo);
  });

  it('should return isValid=true if no conflicts', async () => {
    mockRepo.resolveCalendar = vi.fn().mockResolvedValue({
      holidays: [],
      resolvedOperatingDays: [
        { dayOfWeek: 'MONDAY', isOpen: true, workingHours: [{ startTime: '08:00', endTime: '17:00' }] }
      ]
    });
    mockRepo.listVenueBlocks = vi.fn().mockResolvedValue([]);

    const result = await service.validateSession({
      branchId: 'b1',
      instituteId: 'i1',
      scheduledDate: new Date('2026-07-06'), // A Monday
      startTime: '09:00',
      endTime: '11:00',
    });

    expect(result.isValid).toBe(true);
  });

  it('should detect Holiday conflict', async () => {
    mockRepo.resolveCalendar = vi.fn().mockResolvedValue({
      holidays: [{ id: 'h1', status: 'Active', affectsScheduling: true, name: 'Eid' }],
      resolvedOperatingDays: []
    });

    const result = await service.validateSession({
      branchId: 'b1',
      instituteId: 'i1',
      scheduledDate: new Date('2026-07-06'),
      startTime: '09:00',
      endTime: '11:00',
    });

    expect(result.isValid).toBe(false);
    expect(result.conflicts[0].type).toBe('HOLIDAY');
  });

  it('should detect Venue Block conflict', async () => {
    mockRepo.resolveCalendar = vi.fn().mockResolvedValue({
      holidays: [],
      resolvedOperatingDays: [{ dayOfWeek: 'MONDAY', isOpen: true, workingHours: [{ startTime: '08:00', endTime: '17:00' }] }]
    });
    mockRepo.listVenueBlocks = vi.fn().mockResolvedValue([{
      classroomId: 'r1',
      isFullDay: true,
      status: 'Active',
      reasonCode: 'MAINTENANCE'
    }]);

    const result = await service.validateSession({
      branchId: 'b1',
      instituteId: 'i1',
      scheduledDate: new Date('2026-07-06'),
      startTime: '09:00',
      endTime: '11:00',
      classroomId: 'r1'
    });

    expect(result.isValid).toBe(false);
    expect(result.conflicts[0].type).toBe('VENUE');
  });
});
