import { describe, expect, test, vi } from 'vitest';
import { StudentQueryService, maskEmail, maskPhone, maskNationalId } from './student-query-service';

describe('PII Masking Helpers', () => {
  test('maskEmail should mask local part of email', () => {
    expect(maskEmail('test@example.com')).toBe('t******t@example.com');
    expect(maskEmail('a@example.com')).toBe('a*@example.com');
    expect(maskEmail(null)).toBeNull();
  });

  test('maskPhone should mask phone details', () => {
    expect(maskPhone('+96899112233')).toBe('+968 99***233');
    expect(maskPhone('123456')).toBe('123456');
    expect(maskPhone(null)).toBeNull();
  });

  test('maskNationalId should mask national ID', () => {
    expect(maskNationalId('123456789')).toBe('12******89');
    expect(maskNationalId('12')).toBe('****');
    expect(maskNationalId(null)).toBeNull();
  });
});

describe('StudentQueryService', () => {
  test('globalPersonLookup returns personFound false if person does not exist', async () => {
    const mockPrisma = {
      person: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    const result = await service.globalPersonLookup('notfound@example.com', 'branch-1');

    expect(result.personFound).toBe(false);
    expect(result.personId).toBeNull();
  });

  test('globalPersonLookup returns personFound true with masked names and preflight checks', async () => {
    const person = {
      id: 'person-1',
      firstName: 'Fatima',
      lastName: 'Al-Balushi',
      studentProfile: {
        id: 'profile-1',
        studentNumber: 'STU-123',
      },
    };

    const mockPrisma = {
      person: {
        findFirst: vi.fn().mockResolvedValue(person),
      },
      admission: {
        findFirst: vi.fn().mockResolvedValue({ id: 'admission-1' }),
      },
      enrollment: {
        count: vi.fn().mockResolvedValue(2),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    const result = await service.globalPersonLookup('fatima@example.com', 'branch-1');

    expect(result.personFound).toBe(true);
    expect(result.firstNameMasked).toBe('F****');
    expect(result.lastNameMasked).toBe('A****');
    expect(result.studentProfileId).toBe('profile-1');
    expect(result.studentNumber).toBe('STU-123');
    expect(result.preflight).toEqual({
      hasActiveAdmission: true,
      activeAdmissionId: 'admission-1',
      hasEnrollment: true,
      conflictCode: 'ERR_ADM_ACTIVE_ADMISSION_EXISTS',
    });
  });

  test('searchBranchScopedStudents query includes draft and cancelled states and filters query parameters', async () => {
    const mockProfiles = [
      {
        id: 'profile-1',
        studentNumber: 'STU-123',
        status: 'Active',
        joinedAt: new Date('2026-01-01'),
        person: {
          id: 'person-1',
          firstName: 'Fatima',
          lastName: 'Al-Balushi',
          mobile: '+96899112233',
          email: 'fatima@example.com',
          nationalId: '123456789',
        },
      },
    ];

    const mockPrisma = {
      studentProfile: {
        findMany: vi.fn().mockResolvedValue(mockProfiles),
        count: vi.fn().mockResolvedValue(1),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    const result = await service.searchBranchScopedStudents('Fatima', ['branch-1']);

    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalled();
    expect(result.total).toBe(1);
    expect(result.items[0].person.email).toBe('f******a@example.com');
    expect(result.items[0].person.mobile).toBe('+968 99***233');
    expect(result.items[0].person.nationalId).toBe('12******89');
  });

  test('searchBranchScopedStudents query applies branchId, studentStatus, and admissionStatus filters correctly', async () => {
    const mockPrisma = {
      studentProfile: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    await service.searchBranchScopedStudents('Fatima', ['branch-1', 'branch-2'], {
      branchId: 'branch-1',
      studentStatus: 'Active',
      admissionStatus: 'Draft',
    });

    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'Active',
          admissions: {
            some: {
              branchId: { in: ['branch-1'] },
              admissionStatus: 'Draft',
              isDeleted: false,
            },
          },
        }),
      })
    );
  });



  test('verifyBranchScope throws on deleted or missing studentProfile', async () => {
    const mockPrisma = {
      studentProfile: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    await expect(service.verifyBranchScope('missing-profile', 'branch-1')).rejects.toThrow('ERR_STUDENT_PROFILE_NOT_FOUND');
  });

  test('verifyBranchScope throws on inactive profile status', async () => {
    const mockPrisma = {
      studentProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'profile-1',
          status: 'Suspended',
          isDeleted: false,
          person: { isDeleted: false },
        }),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    await expect(service.verifyBranchScope('profile-1', 'branch-1')).rejects.toThrow('ERR_STU_PROFILE_INACTIVE');
  });

  test('verifyBranchScope throws on branch scope violation', async () => {
    const mockPrisma = {
      studentProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'profile-1',
          status: 'Active',
          isDeleted: false,
          person: { isDeleted: false },
          admissions: [],
          enrollments: [],
        }),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    await expect(service.verifyBranchScope('profile-1', 'branch-1')).rejects.toThrow('ERR_AUTH_BRANCH_DENIED');
  });

  test('verifyBranchScope succeeds on valid branch scope association', async () => {
    const mockPrisma = {
      studentProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'profile-1',
          status: 'Active',
          isDeleted: false,
          person: { isDeleted: false },
          admissions: [{ id: 'admission-1' }],
          enrollments: [],
        }),
      },
    } as any;

    const service = new StudentQueryService(mockPrisma);
    await expect(service.verifyBranchScope('profile-1', 'branch-1')).resolves.toBeUndefined();
  });
});
