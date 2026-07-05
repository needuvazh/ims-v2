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
});
