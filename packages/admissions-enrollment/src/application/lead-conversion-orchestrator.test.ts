import { expect, test, vi } from 'vitest';
import { LeadConversionOrchestrator } from './lead-conversion-orchestrator';

test('LeadConversionOrchestrator should convert lead and create admission successfully', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    auditLog: { create: vi.fn().mockResolvedValue(null) },
    lead: { update: vi.fn().mockResolvedValue(null) },
    documentOwner: {
      findMany: vi.fn().mockResolvedValue([{ documentId: 'doc-1' }]),
    },
    documentVerification: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    person: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  } as any;

  const dob = new Date('1995-05-15');
  const mockLeadService = {
    convertLead: vi.fn().mockResolvedValue({
      id: 'lead-1',
      personId: 'person-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+96899999999',
      branchId: 'branch-1',
      interestedCourseId: 'course-1',
      person: { dateOfBirth: dob },
      nationalId: '123456789',
      nationality: 'Omani',
    }),
  } as any;

  const mockAdmissionService = {
    createStudentAdmission: vi.fn().mockResolvedValue({
      personId: 'person-1',
      studentProfileId: 'profile-1',
      admissionId: 'admission-1',
      admissionNumber: 'ADM-2026-00001',
    }),
  } as any;

  const mockEnrollmentService = {
    createEnrollment: vi.fn().mockResolvedValue({
      id: 'enrollment-1',
      enrollmentNumber: 'ENR-10001',
    }),
  } as any;

  const orchestrator = new LeadConversionOrchestrator(
    mockPrisma,
    mockLeadService,
    mockAdmissionService,
    mockEnrollmentService,
  );

  const documents = [
    {
      fileName: 'civil.pdf',
      fileKey: 'uploads/civil.pdf',
      fileType: 'application/pdf',
      documentType: 'CIVIL_ID_FRONT' as any,
    },
  ];

  const result = await orchestrator.convertLeadToAdmission(
    'lead-1',
    'batch-1',
    documents,
    undefined,
    undefined,
    'actor-1',
  );

  expect(result.admissionId).toBe('admission-1');
  expect(result.enrollmentId).toBe('enrollment-1');
  expect(mockLeadService.convertLead).toHaveBeenCalledWith(
    'lead-1',
    documents,
    mockPrisma,
    'actor-1',
  );
  expect(mockAdmissionService.createStudentAdmission).toHaveBeenCalledWith(
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+96899999999',
      branchId: 'branch-1',
      leadId: 'lead-1',
      courseId: 'course-1',
      dateOfBirth: dob,
      nationalId: '123456789',
      nationality: 'Omani',
    },
    'actor-1',
    mockPrisma,
  );
  expect(mockEnrollmentService.createEnrollment).toHaveBeenCalledWith(
    {
      studentProfileId: 'profile-1',
      admissionId: 'admission-1',
      courseId: 'course-1',
      batchId: 'batch-1',
      branchId: 'branch-1',
      enrollmentType: 'Regular',
      leadId: 'lead-1',
      discountCode: undefined,
      manualDiscountAmount: undefined,
      actorId: 'actor-1',
    },
    mockPrisma,
  );
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  expect(mockPrisma.lead.update).toHaveBeenCalledWith({
    where: { id: 'lead-1' },
    data: {
      admissionNumber: 'ADM-2026-00001',
      version: { increment: 1 },
    },
  });
});

test('LeadConversionOrchestrator should be idempotent and succeed when student profile already exists', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    auditLog: { create: vi.fn().mockResolvedValue(null) },
    lead: { update: vi.fn().mockResolvedValue(null) },
    documentOwner: {
      findMany: vi.fn().mockResolvedValue([{ documentId: 'doc-1' }]),
    },
    documentVerification: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    person: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'person-existing',
        studentProfiles: [
          {
            id: 'profile-existing',
            admissions: [],
          },
        ],
      }),
    },
  } as any;

  const dob = new Date('1995-05-15');
  const mockLeadService = {
    convertLead: vi.fn().mockResolvedValue({
      id: 'lead-1',
      personId: 'person-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+96899999999',
      branchId: 'branch-1',
      interestedCourseId: 'course-1',
      person: { dateOfBirth: dob },
      nationalId: '123456789',
      nationality: 'Omani',
    }),
  } as any;

  const mockAdmissionService = {
    createStudentAdmission: vi.fn().mockResolvedValue({
      personId: 'person-existing',
      studentProfileId: 'profile-existing',
      admissionId: 'admission-new',
      admissionNumber: 'ADM-2026-00002',
    }),
  } as any;

  const mockEnrollmentService = {
    createEnrollment: vi.fn().mockResolvedValue({
      id: 'enrollment-2',
      enrollmentNumber: 'ENR-10002',
    }),
  } as any;

  const orchestrator = new LeadConversionOrchestrator(
    mockPrisma,
    mockLeadService,
    mockAdmissionService,
    mockEnrollmentService,
  );

  const documents = [
    {
      fileName: 'passport.pdf',
      fileKey: 'uploads/passport.pdf',
      fileType: 'application/pdf',
      documentType: 'PASSPORT_SCAN' as any,
    },
  ];

  const result = await orchestrator.convertLeadToAdmission(
    'lead-1',
    'batch-1',
    documents,
    undefined,
    undefined,
    'actor-1',
  );

  expect(result.admissionId).toBe('admission-new');
  expect(result.studentProfileId).toBe('profile-existing');
  expect(result.enrollmentId).toBe('enrollment-2');
  expect(mockAdmissionService.createStudentAdmission).toHaveBeenCalled();
  expect(mockEnrollmentService.createEnrollment).toHaveBeenCalled();
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  expect(mockPrisma.lead.update).toHaveBeenCalledWith({
    where: { id: 'lead-1' },
    data: {
      admissionNumber: 'ADM-2026-00002',
      version: { increment: 1 },
    },
  });
});

test('LeadConversionOrchestrator should reuse existing student profile and active admission without calling createStudentAdmission', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    auditLog: { create: vi.fn().mockResolvedValue(null) },
    lead: { update: vi.fn().mockResolvedValue(null) },
    documentOwner: {
      findMany: vi.fn().mockResolvedValue([{ documentId: 'doc-1' }]),
    },
    documentVerification: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    person: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'person-existing',
        studentProfiles: [
          {
            id: 'profile-existing',
            admissions: [
              {
                id: 'admission-existing',
                admissionNumber: 'ADM-2026-00001',
                admissionStatus: 'Approved',
                admissionDate: new Date(),
              },
            ],
          },
        ],
      }),
    },
  } as any;

  const dob = new Date('1995-05-15');
  const mockLeadService = {
    convertLead: vi.fn().mockResolvedValue({
      id: 'lead-1',
      personId: 'person-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+96899999999',
      branchId: 'branch-1',
      interestedCourseId: 'course-1',
      person: { dateOfBirth: dob },
      nationalId: '123456789',
      nationality: 'Omani',
    }),
  } as any;

  const mockAdmissionService = {
    createStudentAdmission: vi.fn(),
  } as any;

  const mockEnrollmentService = {
    createEnrollment: vi.fn().mockResolvedValue({
      id: 'enrollment-3',
      enrollmentNumber: 'ENR-10003',
    }),
  } as any;

  const orchestrator = new LeadConversionOrchestrator(
    mockPrisma,
    mockLeadService,
    mockAdmissionService,
    mockEnrollmentService,
  );

  const result = await orchestrator.convertLeadToAdmission(
    'lead-1',
    'batch-1',
    [],
    undefined,
    undefined,
    'actor-1',
  );

  expect(result.admissionId).toBe('admission-existing');
  expect(result.studentProfileId).toBe('profile-existing');
  expect(result.enrollmentId).toBe('enrollment-3');
  expect(mockAdmissionService.createStudentAdmission).not.toHaveBeenCalled();
  expect(mockEnrollmentService.createEnrollment).toHaveBeenCalled();
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  expect(mockPrisma.lead.update).toHaveBeenCalledWith({
    where: { id: 'lead-1' },
    data: {
      admissionNumber: 'ADM-2026-00001',
      version: { increment: 1 },
    },
  });
});
