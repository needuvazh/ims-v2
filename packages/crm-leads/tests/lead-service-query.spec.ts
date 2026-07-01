import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LeadService } from '../src/application/lead-service';
import { LeadRepository } from '../src/infrastructure/lead-repository';
import { IFollowUpRepository } from '../src/domain/repositories';

describe('LeadService - Query Filters', () => {
  let prismaMock: any;
  let leadRepository: LeadRepository;
  let followUpRepositoryMock: IFollowUpRepository;
  let leadService: LeadService;

  beforeEach(() => {
    prismaMock = {
      lead: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn((cb) => cb(prismaMock)),
    };

    leadRepository = new LeadRepository(prismaMock as unknown as PrismaClient);
    followUpRepositoryMock = {} as any;
    
    leadService = new LeadService(
      prismaMock as unknown as PrismaClient,
      leadRepository,
      followUpRepositoryMock
    );
  });

  it('should apply branchId filter', async () => {
    await leadService.findAll({ branchId: 'branch-1' }, { page: 1, limit: 10 });
    
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-1',
          isDeleted: false
        })
      })
    );
  });

  it('should apply branchIds filter', async () => {
    await leadService.findAll({ branchIds: ['branch-1', 'branch-2'] }, { page: 1, limit: 10 });
    
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: { in: ['branch-1', 'branch-2'] },
          isDeleted: false
        })
      })
    );
  });

  it('should apply counselorId filter', async () => {
    await leadService.findAll({ counselorId: 'counselor-1' }, { page: 1, limit: 10 });
    
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          counselorId: 'counselor-1',
          isDeleted: false
        })
      })
    );
  });

  it('should return null for invalid UUID in getLeadById without querying database', async () => {
    prismaMock.lead.findUnique = vi.fn();
    const result = await leadService.getLeadById('unassigned-id-uuid');
    expect(result).toBeNull();
    expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
  });

  it('should query database for valid UUID in getLeadById', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    prismaMock.lead.findUnique = vi.fn().mockResolvedValue({ id: validUuid });
    const result = await leadService.getLeadById(validUuid);
    expect(result).toEqual({ id: validUuid });
    expect(prismaMock.lead.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: validUuid, isDeleted: false }
      })
    );
  });
});
