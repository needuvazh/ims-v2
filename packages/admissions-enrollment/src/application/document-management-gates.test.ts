import { expect, test, vi } from 'vitest';
import { RequirementsResolver } from './requirements-resolver';
import { AdmissionService } from './admission-service';
import { EnrollmentService } from './enrollment-service';

test('RequirementsResolver should resolve default CIVIL_ID_FRONT and override SPONSORSHIP_LETTER for CORP courses', async () => {
  const mockPrisma = {
    course: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.id === 'corp-course') {
          return Promise.resolve({ id: 'corp-course', courseCode: 'CORP-101' });
        }
        return Promise.resolve({ id: 'reg-course', courseCode: 'REG-101' });
      }),
    },
    branch: {
      findUnique: vi.fn().mockResolvedValue({ id: 'branch-1', branchCode: 'BR-1' }),
    },
  } as any;

  const resolver = new RequirementsResolver(mockPrisma);

  // 1. Regular course
  const regReqs = await resolver.getRequiredDocuments('reg-course', 'branch-1');
  expect(regReqs).toEqual(['CIVIL_ID_FRONT']);

  // 2. Corporate course
  const corpReqs = await resolver.getRequiredDocuments('corp-course', 'branch-1');
  expect(corpReqs).toEqual(['CIVIL_ID_FRONT', 'SPONSORSHIP_LETTER']);
});

test('AdmissionService verifyAdmissionDocumentsGate should block approval if required documents are missing or unverified', async () => {
  const mockPrisma = {
    admission: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'adm-1',
        personId: 'person-1',
        branchId: 'branch-1',
        courseId: 'corp-course',
        lead: null,
      }),
    },
    course: {
      findUnique: vi.fn().mockResolvedValue({ id: 'corp-course', courseCode: 'CORP-101' }),
    },
    branch: {
      findUnique: vi.fn().mockResolvedValue({ id: 'branch-1', branchCode: 'BR-1' }),
    },
    // Mock user branch access
    userBranchAccess: {
      findFirst: vi.fn().mockResolvedValue({ id: 'access-1' }),
    },
    // Mock documents get: returns civil ID front but no sponsorship letter
    document: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'doc-civil-id',
          documentType: 'CIVIL_ID_FRONT',
          status: 'Active',
          verifications: [{ outcome: 'Verified' }],
        },
      ]),
    },
  } as any;

  const mockRepo = {} as any;
  const admissionService = new AdmissionService(mockRepo, mockPrisma);

  // Should throw because SPONSORSHIP_LETTER is missing/unverified
  await expect(admissionService.verifyAdmissionDocumentsGate('adm-1', mockPrisma))
    .rejects
    .toThrow('ERR_DOCUMENTS_VERIFICATION_GATE_FAILED');
});

test('AdmissionService verifyAdmissionDocumentsGate should permit approval if all required documents are verified', async () => {
  const mockPrisma = {
    admission: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'adm-1',
        personId: 'person-1',
        branchId: 'branch-1',
        courseId: 'corp-course',
        lead: null,
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    course: {
      findUnique: vi.fn().mockResolvedValue({ id: 'corp-course', courseCode: 'CORP-101' }),
    },
    branch: {
      findUnique: vi.fn().mockResolvedValue({ id: 'branch-1', branchCode: 'BR-1' }),
    },
    userBranchAccess: {
      findFirst: vi.fn().mockResolvedValue({ id: 'access-1' }),
    },
    // Mock documents: both are active and verified
    document: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'doc-civil',
          documentType: 'CIVIL_ID_FRONT',
          status: 'Active',
          verifications: [{ outcome: 'Verified' }],
        },
        {
          id: 'doc-sponsor',
          documentType: 'SPONSORSHIP_LETTER',
          status: 'Active',
          verifications: [{ outcome: 'Verified' }],
        },
      ]),
    },
  } as any;

  const mockRepo = {} as any;
  const admissionService = new AdmissionService(mockRepo, mockPrisma);

  // Should succeed without throwing
  await expect(admissionService.verifyAdmissionDocumentsGate('adm-1', mockPrisma)).resolves.not.toThrow();
});

test('EnrollmentService confirmEnrollment should block if unverified and permit if verified', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-1',
        courseId: 'reg-course',
        branchId: 'branch-1',
        enrollmentStatus: 'Draft',
        admission: {
          personId: 'person-1',
        },
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    course: {
      findUnique: vi.fn().mockResolvedValue({ id: 'reg-course', courseCode: 'REG-101' }),
    },
    branch: {
      findUnique: vi.fn().mockResolvedValue({ id: 'branch-1', branchCode: 'BR-1' }),
    },
    userBranchAccess: {
      findFirst: vi.fn().mockResolvedValue({ id: 'access-1' }),
    },
    // Mock documents: Civil ID is uploaded but outcome is Pending (unverified)
    document: {
      findMany: vi.fn().mockImplementation(() => {
        return Promise.resolve([
          {
            id: 'doc-civil',
            documentType: 'CIVIL_ID_FRONT',
            status: 'Active',
            verifications: [{ outcome: 'Pending' }],
          },
        ]);
      }),
    },
  } as any;

  const enrollmentService = new EnrollmentService(mockPrisma);

  // 1. Should fail because verification status is Pending (unverified)
  await expect(enrollmentService.confirmEnrollment('enr-1', 'actor-1', mockPrisma))
    .rejects
    .toThrow('ERR_DOCUMENTS_VERIFICATION_GATE_FAILED');

  // 2. Change mock documents to return Verified
  mockPrisma.document.findMany = vi.fn().mockResolvedValue([
    {
      id: 'doc-civil',
      documentType: 'CIVIL_ID_FRONT',
      status: 'Active',
      verifications: [{ outcome: 'Verified' }],
    },
  ]);

  // Should now succeed
  await expect(enrollmentService.confirmEnrollment('enr-1', 'actor-1', mockPrisma)).resolves.not.toThrow();
  expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({
    where: { id: 'enr-1' },
    data: {
      enrollmentStatus: 'Confirmed',
      confirmedAt: expect.any(Date),
    },
  });
});
