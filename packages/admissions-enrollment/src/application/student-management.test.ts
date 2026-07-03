import { describe, expect, test, vi } from 'vitest';
import { StudentMergeService } from './student-merge-service';
import { StudentStatusService } from './student-status-service';
import { OtpService } from './otp-service';

// ─── OtpService Tests ──────────────────────────────────────────────────────

describe('OtpService', () => {
  test('generateOtp returns a 6-digit string', async () => {
    const svc = new OtpService();
    const code = await svc.generateOtp('person-1');
    expect(code).toMatch(/^\d{6}$/);
  });

  test('verifyOtp returns true for the correct code', async () => {
    const svc = new OtpService();
    const code = await svc.generateOtp('person-1');
    const result = await svc.verifyOtp('person-1', code);
    expect(result).toBe(true);
  });

  test('verifyOtp returns false for an incorrect code', async () => {
    const svc = new OtpService();
    await svc.generateOtp('person-1');
    const result = await svc.verifyOtp('person-1', '000000');
    expect(result).toBe(false);
  });

  test('verifyOtp returns false for an unknown personId', async () => {
    const svc = new OtpService();
    const result = await svc.verifyOtp('unknown-person', '123456');
    expect(result).toBe(false);
  });

  test('verifyOtp consumes the code on success — second call returns false', async () => {
    const svc = new OtpService();
    const code = await svc.generateOtp('person-1');
    await svc.verifyOtp('person-1', code); // consume
    const second = await svc.verifyOtp('person-1', code);
    expect(second).toBe(false);
  });
});

// ─── StudentStatusService Tests ────────────────────────────────────────────

describe('StudentStatusService', () => {
  function buildMockPrisma(overrides: Record<string, any> = {}) {
    return {
      studentProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'stu-1',
          studentStatus: 'Pending',
          isDeleted: false,
          branchId: 'branch-1',
          deletedAt: null,
          deletedBy: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      studentStatusHistory: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn().mockImplementation((fn: any) =>
        fn({
          studentProfile: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'stu-1',
              studentStatus: 'Pending',
              isDeleted: false,
              branchId: 'branch-1',
              deletedAt: null,
              deletedBy: null,
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          studentStatusHistory: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          ...overrides,
        })
      ),
    } as any;
  }

  test('activatePending transitions Pending to Active without error', async () => {
    const prisma = buildMockPrisma();
    const svc = new StudentStatusService(prisma);

    await expect(
      svc.activatePending({
        studentProfileId: 'stu-1',
        actorId: 'user-1',
        branchId: 'branch-1',
      })
    ).resolves.toBeUndefined();
  });

  test('transition throws ERR_STU_STATUS_INVALID_TRANSITION for Pending → Archived', async () => {
    const prisma = buildMockPrisma();
    const svc = new StudentStatusService(prisma);

    await expect(
      svc.transition({
        studentProfileId: 'stu-1',
        newStatus: 'Archived',
        changeReason: 'bad transition test',
        actorId: 'user-1',
        branchId: 'branch-1',
      })
    ).rejects.toThrow('ERR_STU_STATUS_INVALID_TRANSITION');
  });

  test('transition allows Archived → Active for restore', async () => {
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) =>
        fn({
          studentProfile: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'stu-archived',
              studentStatus: 'Archived',
              isDeleted: true,
              branchId: 'branch-1',
              deletedAt: new Date(),
              deletedBy: 'user-1',
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          studentStatusHistory: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        })
      ),
    } as any;

    const svc = new StudentStatusService(prisma);
    await expect(
      svc.transition({
        studentProfileId: 'stu-archived',
        newStatus: 'Active',
        changeReason: 'Restore after correction',
        actorId: 'user-1',
        branchId: 'branch-1',
      })
    ).resolves.toBeUndefined();
  });

  test('transition throws ERR_STU_STATUS_PROFILE_NOT_FOUND for missing profile', async () => {
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) =>
      fn({
        studentProfile: { findUnique: vi.fn().mockResolvedValue(null) },
          studentStatusHistory: {},
          auditLog: {},
        })
      ),
    } as any;

    const svc = new StudentStatusService(prisma);
    await expect(
      svc.activatePending({
        studentProfileId: 'missing-id',
        actorId: 'user-1',
        branchId: 'branch-1',
      })
    ).rejects.toThrow('ERR_STU_STATUS_PROFILE_NOT_FOUND');
  });

  test('transition throws ERR_STU_STATUS_PROFILE_NOT_FOUND for soft-deleted profile', async () => {
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) =>
        fn({
          studentProfile: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'stu-1',
              studentStatus: 'Active',
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: 'user-1',
            }),
          },
          studentStatusHistory: {},
          auditLog: {},
        })
      ),
    } as any;

    const svc = new StudentStatusService(prisma);
    await expect(
      svc.suspend({
        studentProfileId: 'stu-1',
        actorId: 'user-1',
        branchId: 'branch-1',
        reason: 'test',
      })
    ).rejects.toThrow('ERR_STU_STATUS_PROFILE_NOT_FOUND');
  });

  test('archive should soft-delete the student profile and write history', async () => {
    const profileUpdate = vi.fn().mockResolvedValue({});
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) =>
        fn({
          studentProfile: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'stu-1',
              studentStatus: 'Active',
              isDeleted: false,
              branchId: 'branch-1',
              deletedAt: null,
              deletedBy: null,
            }),
            update: profileUpdate,
          },
          studentStatusHistory: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        })
      ),
    } as any;

    const svc = new StudentStatusService(prisma);
    await svc.archive({
      studentProfileId: 'stu-1',
      actorId: 'user-1',
      branchId: 'branch-1',
      reason: 'archived for test',
    });

    expect(profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isDeleted: true,
          status: 'Archived',
          deletedBy: 'user-1',
        }),
      })
    );
  });
});

// ─── StudentMergeService Tests ─────────────────────────────────────────────

describe('StudentMergeService', () => {
  const baseSurvivor = {
    id: 'stu-survivor',
    personId: 'person-survivor',
    branchId: 'branch-1',
    studentNumber: 'STU-2026-00001',
    isDeleted: false,
    person: { id: 'person-survivor' },
  };
  const baseSource = {
    id: 'stu-source',
    personId: 'person-source',
    branchId: 'branch-1',
    studentNumber: 'STU-2026-00002',
    isDeleted: false,
    person: { id: 'person-source' },
  };

  function buildMergeTransactionClient(overrides: Record<string, any> = {}) {
    return {
      studentProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(baseSurvivor)  // survivor
          .mockResolvedValueOnce(baseSource),   // source
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null), // no portal accounts
        update: vi.fn().mockResolvedValue({}),
      },
      admission: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      enrollment: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      lead: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      documentOwner: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        deleteMany: vi.fn().mockResolvedValue({}),
      },
      person: {
        update: vi.fn().mockResolvedValue({}),
      },
      studentMergeLog: {
        create: vi.fn().mockResolvedValue({ id: 'merge-log-1' }),
      },
      ...overrides,
    };
  }

  test('mergeProfiles returns merge summary with correct counts', async () => {
    const tx = buildMergeTransactionClient();
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) => fn(tx)),
    } as any;

    const svc = new StudentMergeService(prisma);
    const result = await svc.mergeProfiles({
      survivorStudentProfileId: 'stu-survivor',
      sourceStudentProfileId: 'stu-source',
      mergeReason: 'Verified duplicate via email match',
      mergedBy: 'user-1',
    });

    expect(result.mergeLogId).toBe('merge-log-1');
    expect(result.reassignedAdmissionsCount).toBe(0);
    expect(result.reassignedEnrollmentsCount).toBe(0);
    expect(result.reassignedOtherRefsCount).toBe(0);
  });

  test('mergeProfiles soft-deletes the source profile and source person after remapping', async () => {
    const sourceProfileUpdate = vi.fn().mockResolvedValue({});
    const sourcePersonUpdate = vi.fn().mockResolvedValue({});
    const tx = buildMergeTransactionClient({
      studentProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(baseSurvivor)
          .mockResolvedValueOnce(baseSource),
        update: sourceProfileUpdate,
      },
      person: {
        update: sourcePersonUpdate,
      },
    });
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) => fn(tx)),
    } as any;

    const svc = new StudentMergeService(prisma);
    await svc.mergeProfiles({
      survivorStudentProfileId: 'stu-survivor',
      sourceStudentProfileId: 'stu-source',
      mergeReason: 'Historical duplicate found in registration cleanup',
      mergedBy: 'user-1',
    });

    expect(sourceProfileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stu-source' },
        data: expect.objectContaining({
          isDeleted: true,
          status: 'Archived',
          deletedBy: 'user-1',
        }),
      })
    );
    expect(sourcePersonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'person-source' },
        data: expect.objectContaining({
          isDeleted: true,
          deletedBy: 'user-1',
        }),
      })
    );
  });

  test('mergeProfiles throws ERR_STU_MERGE_SELF_FORBIDDEN when IDs are identical', async () => {
    const prisma = { $transaction: vi.fn() } as any;
    const svc = new StudentMergeService(prisma);
    await expect(
      svc.mergeProfiles({
        survivorStudentProfileId: 'same-id',
        sourceStudentProfileId: 'same-id',
        mergeReason: 'self-merge test',
        mergedBy: 'user-1',
      })
    ).rejects.toThrow('ERR_STU_MERGE_SELF_FORBIDDEN');
  });

  test('mergeProfiles throws ERR_STU_MERGE_USER_CONFLICT when both profiles have portal accounts', async () => {
    const tx = buildMergeTransactionClient({
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: 'user-survivor-portal' })
          .mockResolvedValueOnce({ id: 'user-source-portal' }),
        update: vi.fn(),
      },
    });
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) => fn(tx)),
    } as any;

    const svc = new StudentMergeService(prisma);
    await expect(
      svc.mergeProfiles({
        survivorStudentProfileId: 'stu-survivor',
        sourceStudentProfileId: 'stu-source',
        mergeReason: 'conflict test - both have portal accounts',
        mergedBy: 'user-1',
      })
    ).rejects.toThrow('ERR_STU_MERGE_USER_CONFLICT');
  });

  test('mergeProfiles remaps the source user to the survivor when only the source has a portal account', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({});
    const tx = buildMergeTransactionClient({
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)                           // survivor has no portal
          .mockResolvedValueOnce({ id: 'user-source-portal' }), // source has portal
        update: updateUserMock,
      },
    });
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) => fn(tx)),
    } as any;

    const svc = new StudentMergeService(prisma);
    await svc.mergeProfiles({
      survivorStudentProfileId: 'stu-survivor',
      sourceStudentProfileId: 'stu-source',
      mergeReason: 'Only source has portal — remap to survivor',
      mergedBy: 'user-1',
    });

    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: expect.any(String) },
        data: expect.objectContaining({
          personId: 'person-survivor',
          updatedBy: 'user-1',
        }),
      })
    );
  });

  test('mergeProfiles throws ERR_STU_MERGE_SURVIVOR_NOT_FOUND for deleted survivor', async () => {
    const tx = buildMergeTransactionClient({
      studentProfile: {
        findUnique: vi.fn().mockResolvedValue({
          ...baseSurvivor,
          isDeleted: true,
        }),
        update: vi.fn(),
      },
    });
    const prisma = {
      $transaction: vi.fn().mockImplementation((fn: any) => fn(tx)),
    } as any;

    const svc = new StudentMergeService(prisma);
    await expect(
      svc.mergeProfiles({
        survivorStudentProfileId: 'stu-survivor',
        sourceStudentProfileId: 'stu-source',
        mergeReason: 'deleted survivor test',
        mergedBy: 'user-1',
      })
    ).rejects.toThrow('ERR_STU_MERGE_SURVIVOR_NOT_FOUND');
  });
});
