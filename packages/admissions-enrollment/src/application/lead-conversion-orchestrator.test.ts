import { expect, test, vi } from 'vitest';
import { LeadConversionOrchestrator } from './lead-conversion-orchestrator';

test('LeadConversionOrchestrator should abort if student duplicate exists', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    auditLog: { create: vi.fn() },
  } as any;

  const mockLeadService = {
    convertLead: vi.fn().mockResolvedValue({
      id: 'lead-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      branchId: 'branch-1',
    }),
  } as any;

  const mockAdmissionService = {
    createStudentAdmission: vi.fn().mockRejectedValue(new Error('A student with this email or phone already exists')),
  } as any;

  const orchestrator = new LeadConversionOrchestrator(mockPrisma, mockLeadService, mockAdmissionService);

  await expect(orchestrator.convertLeadToAdmission('lead-1', ['https://example.com/doc.pdf']))
    .rejects
    .toThrow('A student with this email or phone already exists');

  expect(mockLeadService.convertLead).toHaveBeenCalledWith('lead-1', ['https://example.com/doc.pdf'], mockPrisma, undefined);
  expect(mockAdmissionService.createStudentAdmission).toHaveBeenCalled();
  expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
});
