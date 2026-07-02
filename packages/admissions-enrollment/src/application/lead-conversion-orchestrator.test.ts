import { expect, test, vi } from 'vitest';
import { LeadConversionOrchestrator } from './lead-conversion-orchestrator';

test('LeadConversionOrchestrator should convert lead and create admission successfully', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    auditLog: { create: vi.fn().mockResolvedValue(null) },
  } as any;

  const mockLeadService = {
    convertLead: vi.fn().mockResolvedValue({
      id: 'lead-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+96899999999',
      branchId: 'branch-1',
    }),
  } as any;

  const mockAdmissionService = {
    createStudentAdmission: vi.fn().mockResolvedValue({
      personId: 'person-1',
      studentProfileId: 'profile-1',
      admissionId: 'admission-1',
    }),
  } as any;

  const orchestrator = new LeadConversionOrchestrator(mockPrisma, mockLeadService, mockAdmissionService);

  const documents = [
    {
      fileName: 'civil.pdf',
      fileKey: 'uploads/civil.pdf',
      fileType: 'application/pdf',
      documentType: 'CIVIL_ID_FRONT' as any,
    },
  ];

  const result = await orchestrator.convertLeadToAdmission('lead-1', documents, 'actor-1');

  expect(result.admissionId).toBe('admission-1');
  expect(mockLeadService.convertLead).toHaveBeenCalledWith('lead-1', documents, mockPrisma, 'actor-1');
  expect(mockAdmissionService.createStudentAdmission).toHaveBeenCalledWith({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+96899999999',
    branchId: 'branch-1',
    leadId: 'lead-1',
  }, mockPrisma);
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
});

test('LeadConversionOrchestrator should be idempotent and succeed when student profile already exists', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    auditLog: { create: vi.fn().mockResolvedValue(null) },
  } as any;

  const mockLeadService = {
    convertLead: vi.fn().mockResolvedValue({
      id: 'lead-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+96899999999',
      branchId: 'branch-1',
    }),
  } as any;

  const mockAdmissionService = {
    createStudentAdmission: vi.fn().mockResolvedValue({
      personId: 'person-existing',
      studentProfileId: 'profile-existing',
      admissionId: 'admission-new',
    }),
  } as any;

  const orchestrator = new LeadConversionOrchestrator(mockPrisma, mockLeadService, mockAdmissionService);

  const documents = [
    {
      fileName: 'passport.pdf',
      fileKey: 'uploads/passport.pdf',
      fileType: 'application/pdf',
      documentType: 'PASSPORT_SCAN' as any,
    },
  ];

  const result = await orchestrator.convertLeadToAdmission('lead-1', documents, 'actor-1');

  expect(result.admissionId).toBe('admission-new');
  expect(result.studentProfileId).toBe('profile-existing');
  expect(mockAdmissionService.createStudentAdmission).toHaveBeenCalled();
  expect(mockPrisma.auditLog.create).toHaveBeenCalled();
});
