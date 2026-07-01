import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InquiryApplicationService } from '../src/application/inquiry-service';
import { InquiryRepository } from '../src/infrastructure/inquiry-repository';
import { ILeadRepository } from '../src/domain/repositories';

describe('InquiryApplicationService - Query Filters', () => {
  let prismaMock: any;
  let inquiryRepository: InquiryRepository;
  let leadRepositoryMock: ILeadRepository;
  let inquiryService: InquiryApplicationService;

  beforeEach(() => {
    prismaMock = {
      inquiry: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn((cb) => cb(prismaMock)),
    };

    inquiryRepository = new InquiryRepository(prismaMock as unknown as PrismaClient);
    leadRepositoryMock = {} as any;
    
    inquiryService = new InquiryApplicationService(
      prismaMock as unknown as PrismaClient,
      inquiryRepository,
      leadRepositoryMock
    );
  });

  it('should apply branchId filter', async () => {
    await inquiryService.findAll({ branchId: 'branch-1' }, { page: 1, limit: 10 });
    
    expect(prismaMock.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-1',
          isDeleted: false
        })
      })
    );
  });

  it('should apply branchIds filter', async () => {
    await inquiryService.findAll({ branchIds: ['branch-1', 'branch-2'] }, { page: 1, limit: 10 });
    
    expect(prismaMock.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: { in: ['branch-1', 'branch-2'] },
          isDeleted: false
        })
      })
    );
  });

  it('should apply counselorId filter', async () => {
    await inquiryService.findAll({ counselorId: 'counselor-1' }, { page: 1, limit: 10 });
    
    expect(prismaMock.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          counselorId: 'counselor-1',
          isDeleted: false
        })
      })
    );
  });
});
