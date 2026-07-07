import { expect, test, vi } from 'vitest';
import { RequirementsResolver } from './requirements-resolver';
import { AdmissionService } from './admission-service';
import { EnrollmentService } from './enrollment-service';

test('RequirementsResolver should resolve default CIVIL_ID_FRONT and override SPONSORSHIP_LETTER for CORP courses', async () => {
  const mockPrisma = {
    documentRequirement: {
      findMany: vi.fn().mockImplementation(({ where }) => {
        if (where.OR && where.OR.some((or: any) => or.courseId === 'corp-course')) {
          return Promise.resolve([
            { documentType: 'CIVIL_ID_FRONT' },
            { documentType: 'SPONSORSHIP_LETTER' },
          ]);
        }
        if (where.OR && where.OR.some((or: any) => or.branchId === 'branch-2')) {
          return Promise.resolve([
            { documentType: 'CIVIL_ID_FRONT' },
            { documentType: 'PASSPORT_SCAN' },
            { documentType: 'ACADEMIC_TRANSCRIPT' },
          ]);
        }
        return Promise.resolve([
          { documentType: 'CIVIL_ID_FRONT' },
        ]);
      }),
    },
  } as any;

  const resolver = new RequirementsResolver(mockPrisma);

  // 1. Regular course
  const regReqs = await resolver.getRequiredDocuments('reg-course', 'branch-1');
  expect(regReqs).toEqual(['CIVIL_ID_FRONT']);

  // 2. Corporate course
  const corpReqs = await resolver.getRequiredDocuments('corp-course', 'branch-1');
  expect(corpReqs).toEqual(['CIVIL_ID_FRONT', 'SPONSORSHIP_LETTER']);

  // 3. Branch with REQUIRED_DOCUMENTS policy
  const branchReqs = await resolver.getRequiredDocuments('reg-course', 'branch-2');
  expect(branchReqs).toContain('CIVIL_ID_FRONT');
  expect(branchReqs).toContain('PASSPORT_SCAN');
  expect(branchReqs).toContain('ACADEMIC_TRANSCRIPT');
  expect(branchReqs.length).toBe(3);
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
    documentRequirement: {
      findMany: vi.fn().mockResolvedValue([
        { documentType: 'CIVIL_ID_FRONT' },
        { documentType: 'SPONSORSHIP_LETTER' },
      ]),
    },
    userBranchAccess: {
      findFirst: vi.fn().mockResolvedValue({ id: 'access-1' }),
    },
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
    documentRequirement: {
      findMany: vi.fn().mockResolvedValue([
        { documentType: 'CIVIL_ID_FRONT' },
        { documentType: 'SPONSORSHIP_LETTER' },
      ]),
    },
    userBranchAccess: {
      findFirst: vi.fn().mockResolvedValue({ id: 'access-1' }),
    },
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

  await expect(admissionService.verifyAdmissionDocumentsGate('adm-1', mockPrisma)).resolves.not.toThrow();
});

test('EnrollmentService confirmEnrollment should block if unverified and permit if verified', async () => {
  const mockPrisma = {
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'enr-1',
        courseId: 'reg-course',
        branchId: 'branch-1',
        enrollmentStatus: 'Approved',
        admission: {
          personId: 'person-1',
        },
      }),
      update: vi.fn().mockResolvedValue(null),
    },
    documentRequirement: {
      findMany: vi.fn().mockResolvedValue([
        { documentType: 'CIVIL_ID_FRONT' },
      ]),
    },
    userBranchAccess: {
      findFirst: vi.fn().mockResolvedValue({ id: 'access-1' }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(null),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
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

  await expect(enrollmentService.confirmEnrollment('enr-1', 'actor-1', mockPrisma))
    .rejects
    .toThrow('ERR_DOCUMENTS_VERIFICATION_GATE_FAILED');

  mockPrisma.document.findMany = vi.fn().mockResolvedValue([
    {
      id: 'doc-civil',
      documentType: 'CIVIL_ID_FRONT',
      status: 'Active',
      verifications: [{ outcome: 'Verified' }],
    },
  ]);

  await expect(enrollmentService.confirmEnrollment('enr-1', 'actor-1', mockPrisma)).resolves.not.toThrow();
  expect(mockPrisma.enrollment.update).toHaveBeenCalledWith({
    where: { id: 'enr-1' },
    data: {
      enrollmentStatus: 'Confirmed',
      confirmedAt: expect.any(Date),
    },
  });
});
