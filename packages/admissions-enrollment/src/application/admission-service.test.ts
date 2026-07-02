import { expect, test, vi } from 'vitest';
import { AdmissionService } from './admission-service';

test('createStudentAdmission should check duplicates, generate STU/ADM numbers and create draft admission with outbox events', async () => {
  const mockRepo = {
    findPersonByEmailOrPhone: vi.fn().mockResolvedValue(null),
    findStudentProfileByPersonId: vi.fn().mockResolvedValue(null),
    getNextStudentNumber: vi.fn().mockResolvedValue('STU-2026-10001'),
    getNextAdmissionNumber: vi.fn().mockResolvedValue('ADM-2026-10001'),
    hasActiveAdmission: vi.fn().mockResolvedValue(false),
    createStudentProfileAndAdmission: vi.fn().mockResolvedValue({
      personId: 'person-1',
      studentProfileId: 'profile-1',
      admissionId: 'admission-1',
      admissionNumber: 'ADM-2026-10001',
    }),
  } as any;

  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    outboxEvent: { create: vi.fn().mockResolvedValue(null) },
    auditLog: { create: vi.fn().mockResolvedValue(null) },
  } as any;

  const service = new AdmissionService(mockRepo, mockPrisma);

  const input = {
    firstName: 'Fatima',
    lastName: 'Al-Balushi',
    email: 'fatima@example.om',
    phone: '+96899112233',
    branchId: 'branch-1',
    leadId: 'lead-1',
    courseId: 'course-1',
  };

  const result = await service.createStudentAdmission(input);

  expect(result.admissionId).toBe('admission-1');
  expect(mockRepo.getNextStudentNumber).toHaveBeenCalled();
  expect(mockRepo.createStudentProfileAndAdmission).toHaveBeenCalledWith(input, 'STU-2026-10001', mockPrisma);
  
  // Verify Outbox events
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledTimes(2); // AdmissionCreated & StudentProfileCreated (isNewProfile = true)
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
});

test('createStudentAdmission should block draft creation if active admission already exists in target branch', async () => {
  const mockRepo = {
    findPersonByEmailOrPhone: vi.fn().mockResolvedValue({ id: 'person-1' }),
    findStudentProfileByPersonId: vi.fn().mockResolvedValue({ id: 'profile-1', studentNumber: 'STU-123' }),
    hasActiveAdmission: vi.fn().mockResolvedValue(true),
  } as any;

  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  } as any;

  const service = new AdmissionService(mockRepo, mockPrisma);

  const input = {
    firstName: 'Fatima',
    lastName: 'Al-Balushi',
    email: 'fatima@example.om',
    phone: '+96899112233',
    branchId: 'branch-1',
  };

  await expect(service.createStudentAdmission(input))
    .rejects
    .toThrow('ERR_ADM_ACTIVE_ADMISSION_EXISTS');
});

test('approveAdmission should fail if current status is Draft (blocking bypass)', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    admission: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'adm-1',
        admissionStatus: 'Draft',
        branchId: 'branch-1',
      }),
    },
  } as any;

  const mockRepo = {} as any;
  const service = new AdmissionService(mockRepo, mockPrisma);

  await expect(service.approveAdmission('adm-1', 'actor-1'))
    .rejects
    .toThrow('ERR_ADMISSION_INVALID_STATUS_TRANSITION');
});

test('submitAdmission and approveAdmission lifecycle flow should succeed sequentially', async () => {
  const mockAdmission = {
    id: 'adm-1',
    admissionStatus: 'Draft',
    branchId: 'branch-1',
    personId: 'person-1',
    courseId: null,
    lead: null,
  };

  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    admission: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(mockAdmission)),
      update: vi.fn().mockImplementation(({ data }) => {
        if (data.admissionStatus) {
          mockAdmission.admissionStatus = data.admissionStatus;
        }
        return Promise.resolve(mockAdmission);
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue(null) },
    document: { findMany: vi.fn().mockResolvedValue([]) }, // resolves verified documents
  } as any;

  const mockRepo = {} as any;
  const service = new AdmissionService(mockRepo, mockPrisma);

  // 1. Transition Draft -> Submitted
  await service.submitAdmission('adm-1', 'actor-1');
  expect(mockAdmission.admissionStatus).toBe('Submitted');
  expect(mockPrisma.admission.update).toHaveBeenCalled();
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();

  // 2. Transition Submitted -> Approved
  await service.approveAdmission('adm-1', 'actor-1');
  expect(mockAdmission.admissionStatus).toBe('Approved');
});

test('rejectAdmission should transition Submitted to Rejected and cancelAdmission should transition Draft to Cancelled', async () => {
  const mockAdmission = {
    id: 'adm-1',
    admissionStatus: 'Submitted',
    branchId: 'branch-1',
  };

  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    admission: {
      findUnique: vi.fn().mockResolvedValue(mockAdmission),
      update: vi.fn().mockImplementation(({ data }) => {
        if (data.admissionStatus) {
          mockAdmission.admissionStatus = data.admissionStatus;
        }
        return Promise.resolve(mockAdmission);
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue(null) },
  } as any;

  const mockRepo = {} as any;
  const service = new AdmissionService(mockRepo, mockPrisma);

  // 1. Reject requires remarks
  await expect(service.rejectAdmission('adm-1', '', 'actor-1'))
    .rejects
    .toThrow('ERR_ADMISSION_REJECTION_REMARKS_REQUIRED');

  // 2. Successful Rejection
  await service.rejectAdmission('adm-1', 'Incorrect details', 'actor-1');
  expect(mockAdmission.admissionStatus).toBe('Rejected');

  // 3. Cancel draft
  mockAdmission.admissionStatus = 'Draft';
  await service.cancelAdmission('adm-1', 'actor-1');
  expect(mockAdmission.admissionStatus).toBe('Cancelled');
});
