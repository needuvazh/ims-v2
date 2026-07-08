import { expect, test, vi, beforeEach } from 'vitest';
import { GenerateCertificateService } from './GenerateCertificateService';
import { IssueCertificateService } from './IssueCertificateService';
import { ReissueService } from './ReissueService';
import { RevocationService } from './RevocationService';
import { VerificationService } from './VerificationService';
import { DomainError, ErrorCodes } from '../domain/errors';
import { prisma } from '@ims/database';

const VALID_ENROLLMENT_ID = '11111111-1111-1111-1111-111111111111';
const VALID_STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const VALID_COURSE_ID = '33333333-3333-3333-3333-333333333333';
const VALID_BATCH_ID = '44444444-4444-4444-4444-444444444444';
const VALID_BRANCH_ID = '55555555-5555-5555-5555-555555555555';
const VALID_CERTIFICATE_ID = '66666666-6666-6666-6666-666666666666';
const VALID_REISSUE_REQUEST_ID = '77777777-7777-7777-7777-777777777777';

vi.mock('@ims/database', () => {
  const mockPrisma = {
    certificate: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    certificateReissueRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    certificateVerification: {
      create: vi.fn(),
    },
    studentProfile: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

const mockEnrollmentReadPort = {
  getEnrollmentContext: vi.fn(),
};

const mockCompletionReadPort = {
  isCompletionApproved: vi.fn(),
};

const mockFinanceValidationPort = {
  isPaymentValidationPassed: vi.fn(),
};

const mockNumberingPort = {
  allocateCertificateNumber: vi.fn(),
};

const mockAuditPort = {
  logAction: vi.fn(),
};

const mockNotificationPort = {
  requestNotification: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('GenerateCertificateService - generates certificate successfully when eligible', async () => {
  mockEnrollmentReadPort.getEnrollmentContext.mockResolvedValue({
    id: VALID_ENROLLMENT_ID,
    studentProfileId: VALID_STUDENT_ID,
    courseId: VALID_COURSE_ID,
    batchId: VALID_BATCH_ID,
    branchId: VALID_BRANCH_ID,
    paymentValidationRequired: true,
    courseCode: 'CRS-101',
  });
  mockCompletionReadPort.isCompletionApproved.mockResolvedValue(true);
  mockFinanceValidationPort.isPaymentValidationPassed.mockResolvedValue(true);
  mockNumberingPort.allocateCertificateNumber.mockResolvedValue(
    'CERT-BR1-999999',
  );

  vi.mocked(prisma.certificate.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.certificate.create).mockResolvedValue({
    id: VALID_CERTIFICATE_ID,
    certificateNumber: 'CERT-BR1-999999',
  } as any);

  const service = new GenerateCertificateService(
    mockEnrollmentReadPort as any,
    mockCompletionReadPort as any,
    mockFinanceValidationPort as any,
    mockNumberingPort as any,
    mockAuditPort as any,
  );

  const certId = await service.execute(
    {
      enrollmentId: VALID_ENROLLMENT_ID,
      language: 'en',
      idempotencyKey: 'idempotency-1234567890',
    },
    '11111111-2222-3333-4444-555555555555',
  );

  expect(certId).toBe(VALID_CERTIFICATE_ID);
  expect(mockEnrollmentReadPort.getEnrollmentContext).toHaveBeenCalledWith(
    VALID_ENROLLMENT_ID,
  );
  expect(mockCompletionReadPort.isCompletionApproved).toHaveBeenCalledWith(
    VALID_ENROLLMENT_ID,
  );
  expect(
    mockFinanceValidationPort.isPaymentValidationPassed,
  ).toHaveBeenCalledWith(VALID_ENROLLMENT_ID);
  expect(prisma.certificate.create).toHaveBeenCalled();
  expect(mockAuditPort.logAction).toHaveBeenCalledWith(
    'CERTIFICATE_GENERATED',
    '11111111-2222-3333-4444-555555555555',
    VALID_CERTIFICATE_ID,
    expect.any(Object),
  );
});

test('GenerateCertificateService - throws error when completion is not approved', async () => {
  mockEnrollmentReadPort.getEnrollmentContext.mockResolvedValue({
    id: VALID_ENROLLMENT_ID,
    paymentValidationRequired: false,
    studentProfileId: VALID_STUDENT_ID,
    courseId: VALID_COURSE_ID,
    batchId: VALID_BATCH_ID,
    branchId: VALID_BRANCH_ID,
  });
  mockCompletionReadPort.isCompletionApproved.mockResolvedValue(false);

  const service = new GenerateCertificateService(
    mockEnrollmentReadPort as any,
    mockCompletionReadPort as any,
    mockFinanceValidationPort as any,
    mockNumberingPort as any,
    mockAuditPort as any,
  );

  await expect(
    service.execute(
      {
        enrollmentId: VALID_ENROLLMENT_ID,
        language: 'en',
        idempotencyKey: 'idempotency-1234567890',
      },
      '11111111-2222-3333-4444-555555555555',
    ),
  ).rejects.toThrow(DomainError);
});

test('IssueCertificateService - transitions state and requests notification successfully', async () => {
  vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
    id: VALID_CERTIFICATE_ID,
    certificateNumber: 'CERT-BR1-999999',
    certificateStatus: 'Generated',
    version: 1,
    studentProfileId: VALID_STUDENT_ID,
    verificationCode: 'VER-CODE-1',
  } as any);

  vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue({
    id: VALID_STUDENT_ID,
    personId: '33333333-4444-5555-6666-777777777777',
  } as any);

  const service = new IssueCertificateService(
    mockAuditPort as any,
    mockNotificationPort as any,
  );

  await service.execute(
    {
      certificateId: VALID_CERTIFICATE_ID,
      expectedVersion: 1,
      idempotencyKey: 'idempotency-1234567890',
    },
    '11111111-2222-3333-4444-555555555555',
  );

  expect(prisma.certificate.update).toHaveBeenCalledWith({
    where: { id: VALID_CERTIFICATE_ID },
    data: {
      certificateStatus: 'Issued',
      issuedDate: expect.any(Date),
      issuedBy: '11111111-2222-3333-4444-555555555555',
      version: { increment: 1 },
    },
  });
  expect(mockAuditPort.logAction).toHaveBeenCalledWith(
    'CERTIFICATE_ISSUED',
    '11111111-2222-3333-4444-555555555555',
    VALID_CERTIFICATE_ID,
    expect.any(Object),
  );
  expect(mockNotificationPort.requestNotification).toHaveBeenCalledWith(
    'CERTIFICATE_ISSUED',
    '33333333-4444-5555-6666-777777777777',
    expect.any(Object),
  );
});

test('RevocationService - revokes certificate and records revocation info', async () => {
  vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
    id: VALID_CERTIFICATE_ID,
    certificateNumber: 'CERT-BR1-999999',
    certificateStatus: 'Issued',
    version: 2,
  } as any);

  const service = new RevocationService(mockAuditPort as any);

  await service.execute(
    {
      certificateId: VALID_CERTIFICATE_ID,
      reason: 'Student name was spelled wrong',
      expectedVersion: 2,
    },
    '11111111-2222-3333-4444-555555555555',
  );

  expect(prisma.certificate.update).toHaveBeenCalledWith({
    where: { id: VALID_CERTIFICATE_ID },
    data: {
      certificateStatus: 'Revoked',
      revokedAt: expect.any(Date),
      revokedBy: '11111111-2222-3333-4444-555555555555',
      revocationReason: 'Student name was spelled wrong',
      version: { increment: 1 },
    },
  });
});

test('ReissueService - submits reissue request successfully', async () => {
  vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
    id: VALID_CERTIFICATE_ID,
    certificateStatus: 'Issued',
  } as any);
  vi.mocked(prisma.certificateReissueRequest.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.certificateReissueRequest.create).mockResolvedValue({
    id: VALID_REISSUE_REQUEST_ID,
  } as any);

  const service = new ReissueService(
    mockAuditPort as any,
    mockNumberingPort as any,
    mockEnrollmentReadPort as any,
  );

  const reqId = await service.submitRequest(
    {
      certificateId: VALID_CERTIFICATE_ID,
      reason: 'Name was mis-spelled on certificate print',
    },
    '11111111-2222-3333-4444-555555555555',
  );

  expect(reqId).toBe(VALID_REISSUE_REQUEST_ID);
  expect(prisma.certificateReissueRequest.create).toHaveBeenCalled();
});

test('VerificationService - returns Valid status for authentic issued certificate', async () => {
  vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
    id: VALID_CERTIFICATE_ID,
    certificateNumber: 'CERT-BR1-999999',
    certificateStatus: 'Issued',
    language: 'en',
    verificationCode: 'VER-CODE-123',
    issuedDate: new Date(),
    studentProfile: {
      studentNumber: 'STU-001',
      person: {
        firstName: 'Fatima',
        lastName: 'Al-Balushi',
      },
    },
    course: {
      courseCode: 'CRS-101',
      nameEnglish: 'Process Safety Fundamentals',
    },
  } as any);

  const service = new VerificationService();
  const verifyResult = await service.verify(
    { verificationCode: 'VER-CODE-123' },
    '127.0.0.1',
  );

  expect(verifyResult.status).toBe('VALID');
  expect(verifyResult.studentDisplayName).toBe('Fatima Al-Balushi');
  expect(verifyResult.courseName).toBe('Process Safety Fundamentals');
  expect(prisma.certificateVerification.create).toHaveBeenCalled();
});
