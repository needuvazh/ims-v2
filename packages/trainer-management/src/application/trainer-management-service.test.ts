import { describe, expect, it, vi } from 'vitest';
import { TrainerManagementService } from './trainer-management-service';

function createService(overrides?: Record<string, unknown>) {
  const repository: any = {
    listTrainers: vi.fn(),
    findTrainerById: vi.fn(),
    findTrainerByPersonId: vi.fn(),
    createTrainerProfile: vi.fn(),
    updateTrainerProfile: vi.fn(),
    transitionTrainerStatus: vi.fn(),
    listQualifications: vi.fn(),
    createQualification: vi.fn(),
    updateQualification: vi.fn(),
    deleteQualification: vi.fn(),
    listAvailability: vi.fn(),
    createAvailability: vi.fn(),
    updateAvailability: vi.fn(),
    deleteAvailability: vi.fn(),
    validateAvailability: vi.fn(),
    listAuthorizations: vi.fn(),
    createAuthorization: vi.fn(),
    transitionAuthorization: vi.fn(),
    listCompensationRates: vi.fn(),
    createCompensationRate: vi.fn(),
    updateCompensationRate: vi.fn(),
    resolveCompensationRate: vi.fn(),
    listAssignmentReferences: vi.fn(),
    listReports: vi.fn(),
    listAuditHistory: vi.fn(),
    findEligibleTrainers: vi.fn(),
    ...overrides,
  };

  return {
    service: new TrainerManagementService(repository),
    repository,
  };
}

describe('TrainerManagementService', () => {
  it('rejects duplicate trainer profiles for the same person', async () => {
    const { service, repository } = createService();
    repository.findTrainerByPersonId.mockResolvedValue({
      id: 'trainer-1',
      personId: 'person-1',
      branchId: 'branch-1',
      trainerCode: 'TR-001',
      trainerType: 'FullTime',
      specialization: 'Math',
      qualificationSummary: null,
      status: 'Active',
      effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
      effectiveEndDate: null,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      version: 1,
      isDeleted: false,
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
    });

    await expect(
      service.createTrainerProfile(
        {
          personId: 'person-1',
          branchId: 'branch-1',
          trainerCode: 'TR-002',
          trainerType: 'FullTime',
          specialization: 'Physics',
          qualificationSummary: null,
          status: 'Active',
          effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
          effectiveEndDate: null,
          createdBy: null,
          updatedBy: null,
          deletedAt: null,
          deletedBy: null,
          isDeleted: false,
        } as never,
        {
          actorId: 'actor-1',
          permissions: ['trainer.create', 'trainer.read'],
          allowedBranchIds: ['branch-1'],
        },
      ),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: 'Trainer profile already exists for this person.',
    });
  });

  it('blocks trainer creation outside the allowed branch scope', async () => {
    const { service, repository } = createService();
    repository.findTrainerByPersonId.mockResolvedValue(null);

    await expect(
      service.createTrainerProfile(
        {
          personId: 'person-2',
          branchId: 'branch-2',
          trainerCode: 'TR-003',
          trainerType: 'PartTime',
          specialization: 'Science',
          qualificationSummary: null,
          status: 'Active',
          effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
          effectiveEndDate: null,
          createdBy: null,
          updatedBy: null,
          deletedAt: null,
          deletedBy: null,
          isDeleted: false,
        } as never,
        {
          actorId: 'actor-1',
          permissions: ['trainer.create', 'trainer.read'],
          allowedBranchIds: ['branch-1'],
        },
      ),
    ).rejects.toMatchObject({ code: 'branch_scope_violation' });
    expect(repository.createTrainerProfile).not.toHaveBeenCalled();
  });

  it('enforces availability branch scope checks on creation', async () => {
    const { service, repository } = createService();
    await expect(
      service.createAvailability(
        'trainer-1',
        {
          branchId: 'branch-2',
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '12:00',
          status: 'Active',
          effectiveStartDate: new Date('2025-01-01'),
          effectiveEndDate: null,
          createdBy: 'actor-1',
        } as any,
        {
          actorId: 'actor-1',
          permissions: ['trainer.availability.manage'],
          allowedBranchIds: ['branch-1'],
        },
      ),
    ).rejects.toMatchObject({ code: 'branch_scope_violation' });
    expect(repository.createAvailability).not.toHaveBeenCalled();
  });

  it('enforces authorizations permissions on creation', async () => {
    const { service, repository } = createService();
    await expect(
      service.createAuthorization(
        'trainer-1',
        {
          courseId: 'course-1',
          status: 'Active',
          effectiveStartDate: new Date('2025-01-01'),
          effectiveEndDate: null,
        } as any,
        {
          actorId: 'actor-1',
          permissions: ['trainer.read'], // missing trainer.authorization.manage
          allowedBranchIds: ['branch-1'],
        },
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(repository.createAuthorization).not.toHaveBeenCalled();
  });

  it('resolves the most specific compensation rate', async () => {
    const { service, repository } = createService();
    const expectedRate = { id: 'rate-1', amount: '50', currency: 'OMR' };
    repository.resolveCompensationRate.mockResolvedValue(expectedRate);

    const result = await service.resolveCompensationRate(
      {
        trainerId: 'trainer-1',
        paymentBasis: 'PerHour',
        effectiveOn: new Date('2025-01-01'),
      },
      {
        actorId: 'actor-1',
        permissions: ['trainer.compensation.read'],
        allowedBranchIds: ['branch-1'],
      },
    );

    expect(result).toBe(expectedRate);
    expect(repository.resolveCompensationRate).toHaveBeenCalledWith({
      trainerId: 'trainer-1',
      paymentBasis: 'PerHour',
      effectiveOn: expect.any(Date),
    });
  });

  it('blocks compensation rate resolution if permissions are missing', async () => {
    const { service, repository } = createService();
    await expect(
      service.resolveCompensationRate(
        {
          trainerId: 'trainer-1',
          paymentBasis: 'PerHour',
          effectiveOn: new Date('2025-01-01'),
        },
        {
          actorId: 'actor-1',
          permissions: ['trainer.read'], // missing trainer.compensation.read
          allowedBranchIds: ['branch-1'],
        },
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(repository.resolveCompensationRate).not.toHaveBeenCalled();
  });

  it('passes sessionId to repository when calling findEligibleTrainers', async () => {
    const { service, repository } = createService();
    const mockResult = { items: [], total: 0 };
    repository.findEligibleTrainers.mockResolvedValue(mockResult);

    const input = {
      courseId: 'course-1',
      branchId: 'branch-1',
      targetDate: new Date('2025-01-01'),
      startTime: '09:00',
      endTime: '12:00',
      sessionId: 'session-1',
    };

    const result = await service.findEligibleTrainers(
      input,
      { page: 1, pageSize: 10 },
      {
        actorId: 'actor-1',
        permissions: ['trainer.eligibility.read'],
        allowedBranchIds: ['branch-1'],
      },
    );

    expect(result).toBe(mockResult);
    expect(repository.findEligibleTrainers).toHaveBeenCalledWith(
      input,
      { page: 1, pageSize: 10 },
    );
  });
});
