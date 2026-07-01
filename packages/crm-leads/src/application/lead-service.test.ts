import { expect, test, vi } from 'vitest';
import { LeadService } from './lead-service';
import { PhoneSchema, DateOfBirthSchema } from '../domain/lead';

// 1. Phone and DOB normalization unit tests
test('PhoneSchema pre-processor should normalize Omani numbers correctly', () => {
  expect(PhoneSchema.parse('96891234567')).toBe('+96891234567');
  expect(PhoneSchema.parse('+968 7123 4567')).toBe('+96871234567');
  expect(PhoneSchema.parse('  91234567  ')).toBe('91234567'); // default Omani local mobile
  expect(PhoneSchema.parse('+971501234567')).toBe('+971501234567'); // international format preserved
});

test('DateOfBirthSchema pre-processor should coerce dates correctly', () => {
  expect(DateOfBirthSchema.parse('')).toBeNull();
  expect(DateOfBirthSchema.parse('   ')).toBeNull();
  expect(DateOfBirthSchema.parse(null)).toBeNull();

  const parsed = DateOfBirthSchema.parse('1995-12-15');
  expect(parsed).toBeInstanceOf(Date);
  expect((parsed as Date).toISOString()).toContain('1995-12-15');
});

// 2. LeadService unit tests
test('LeadService.createLead should reuse an existing Person record matching the mobile number', async () => {
  const mockPrisma = {
    user: { findFirst: vi.fn().mockResolvedValue({ id: 'counselor-1', status: 'Active', isDeleted: false }) },
    person: {
      findFirst: vi.fn().mockResolvedValue({ id: 'person-existing', mobile: '+968 12345678' }),
      update: vi.fn().mockResolvedValue({ id: 'person-existing', mobile: '+968 12345678' }),
    },
    lead: { findFirst: vi.fn().mockResolvedValue(null) },
    branch: { findUnique: vi.fn().mockResolvedValue({ branchCode: 'MCT' }) },
    outboxEvent: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  } as any;

  const mockLeadRepo = {
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'lead-1', ...data })),
  } as any;

  const mockFollowUpRepo = {} as any;
  const leadService = new LeadService(mockPrisma, mockLeadRepo, mockFollowUpRepo);

  const input = {
    branchId: 'branch-1',
    firstName: 'Salim',
    lastName: 'Al-Harthy',
    phone: '+968 12345678',
    email: 'salim@example.com',
    source: 'Campaign' as const,
    counselorId: 'counselor-1',
    interestedCourseId: 'course-1',
  };

  const result = await leadService.createLead(input, 'actor-1');

  const currentYear = new Date().getFullYear();
  const pattern = new RegExp(`^LD-${currentYear}-MCT-\\d{5}$`);

  expect(mockPrisma.person.findFirst).toHaveBeenCalled();
  expect(mockLeadRepo.create).toHaveBeenCalledWith(
    expect.objectContaining({
      personId: 'person-existing', // reused!
      leadNumber: expect.stringMatching(pattern),
    }),
    mockPrisma
  );
  expect(result.leadNumber).toContain(`LD-${currentYear}-MCT-`);
});

test('LeadService.createLead should throw duplicate error if active duplicate exists and bypass is false', async () => {
  const mockPrisma = {
    user: { findFirst: vi.fn().mockResolvedValue({ id: 'counselor-1', status: 'Active', isDeleted: false }) },
    lead: { findFirst: vi.fn().mockResolvedValue({ id: 'lead-dup', leadNumber: 'LD-DUP' }) },
    branch: { findUnique: vi.fn().mockResolvedValue({ branchCode: 'MCT' }) },
  } as any;

  const mockLeadRepo = {} as any;
  const mockFollowUpRepo = {} as any;
  const leadService = new LeadService(mockPrisma, mockLeadRepo, mockFollowUpRepo);

  const input = {
    branchId: 'branch-1',
    firstName: 'Salim',
    lastName: 'Al-Harthy',
    phone: '+968 12345678',
    email: 'salim@example.com',
    source: 'Campaign' as const,
    counselorId: 'counselor-1',
    interestedCourseId: 'course-1',
  };

  await expect(leadService.createLead(input, 'actor-1'))
    .rejects
    .toThrow('ERR_CRM_DUPLICATE_LEAD_DETECTED');
});

test('LeadService.createLead should bypass duplicate check if bypassDuplicateBlock is true', async () => {
  const mockPrisma = {
    user: { findFirst: vi.fn().mockResolvedValue({ id: 'counselor-1', status: 'Active', isDeleted: false }) },
    lead: { findFirst: vi.fn().mockResolvedValue({ id: 'lead-dup', leadNumber: 'LD-DUP' }) },
    person: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'person-new' }) },
    branch: { findUnique: vi.fn().mockResolvedValue({ branchCode: 'MCT' }) },
    outboxEvent: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  } as any;

  const mockLeadRepo = {
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'lead-1', ...data })),
  } as any;

  const mockFollowUpRepo = {} as any;
  const leadService = new LeadService(mockPrisma, mockLeadRepo, mockFollowUpRepo);

  const input = {
    branchId: 'branch-1',
    firstName: 'Salim',
    lastName: 'Al-Harthy',
    phone: '+968 12345678',
    email: 'salim@example.com',
    source: 'Campaign' as const,
    counselorId: 'counselor-1',
    interestedCourseId: 'course-1',
    bypassDuplicateBlock: true, // bypass!
  };

  const result = await leadService.createLead(input, 'actor-1');
  expect(result.id).toBe('lead-1');
  expect(mockLeadRepo.create).toHaveBeenCalled();
});

test('LeadService.updateStage should enforce optimistic concurrent locks', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    outboxEvent: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    leadStageHistory: { create: vi.fn() },
  } as any;

  const mockLeadRepo = {
    findById: vi.fn().mockResolvedValue({
      id: 'lead-1',
      stage: 'New',
      version: 1,
      branchId: 'branch-1',
      leadNumber: 'LD-1',
    }),
    updateStage: vi.fn().mockImplementation((id, stage, version) => {
      if (version !== 1) {
        throw new Error('ERR_CRM_CONCURRENCY_VIOLATION');
      }
      return Promise.resolve();
    }),
  } as any;

  const mockFollowUpRepo = {} as any;
  const leadService = new LeadService(mockPrisma, mockLeadRepo, mockFollowUpRepo);

  // Mismatched version update throws concurrency error
  await expect(
    leadService.updateStage('lead-1', { newStage: 'FollowUp', version: 2 }, 'actor-1')
  ).rejects.toThrow('ERR_CRM_CONCURRENCY_VIOLATION');

  // Matching version update succeeds
  await leadService.updateStage('lead-1', { newStage: 'FollowUp', version: 1 }, 'actor-1');
  expect(mockLeadRepo.updateStage).toHaveBeenCalledWith('lead-1', 'FollowUp', 1, mockPrisma);
});

test('LeadService.closeLeadLost should reject lost reason notes under 15 characters', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  } as any;

  const mockLeadRepo = {
    findById: vi.fn().mockResolvedValue({ id: 'lead-1', stage: 'New', version: 1 }),
  } as any;

  const mockFollowUpRepo = {} as any;
  const leadService = new LeadService(mockPrisma, mockLeadRepo, mockFollowUpRepo);

  await expect(
    leadService.closeLeadLost('lead-1', { lostReasonCode: 'PriceTooHigh', lostReasonNotes: 'Too short' })
  ).rejects.toThrow('ERR_CRM_LOST_REASON_REQUIRED');
});

test('LeadService.convertLead should enforce Won outcome preconditions', async () => {
  const mockPrisma = {
    outboxEvent: {
      createMany: vi.fn().mockResolvedValue(null),
    },
    leadStageHistory: { create: vi.fn() },
  } as any;
  const mockLeadRepo = {
    findById: vi.fn().mockImplementation((id) => {
      return Promise.resolve({
        id,
        email: 'salim@example.com',
        phone: '+968 12345678',
        version: 1,
        person: {
          dateOfBirth: new Date('1995-05-15'), // valid birthdate
        },
      });
    }),
    updateStage: vi.fn().mockResolvedValue(null),
    updateLead: vi.fn().mockResolvedValue(null),
  } as any;

  const mockFollowUpRepo = {
    cancelAllScheduled: vi.fn().mockResolvedValue(0),
  } as any;
  const leadService = new LeadService(mockPrisma, mockLeadRepo, mockFollowUpRepo);

  // Fails if missing documentLinks
  await expect(
    leadService.convertLead('lead-1', [], mockPrisma)
  ).rejects.toThrow('ERR_CRM_WON_PRECONDITIONS_MISSED');

  // Succeeds if documentLinks are present
  const result = await leadService.convertLead('lead-1', ['https://example.com/civil.pdf'], mockPrisma);
  expect(result.id).toBe('lead-1');
  expect(mockLeadRepo.updateStage).toHaveBeenCalledWith('lead-1', 'Won', 1, mockPrisma);
  expect(mockLeadRepo.updateStage).toHaveBeenCalledWith('lead-1', 'Converted', 2, mockPrisma);
});

test('LeadService.updateLead should merge partial updates and detect active duplicates', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    lead: {
      findFirst: vi.fn().mockResolvedValue({ id: 'lead-duplicate' }),
    },
  } as any;

  const mockLeadRepo = {
    findById: vi.fn().mockResolvedValue({
      id: 'lead-1',
      phone: '+96890000000',
      email: 'original@example.com',
      branchId: 'branch-1',
      interestedCourseId: 'course-1',
      version: 1,
    }),
    updateLead: vi.fn().mockResolvedValue(null),
  } as any;

  const leadService = new LeadService(mockPrisma, mockLeadRepo, {} as any);

  // When updating phone only (partial update), it should resolve branchId & interestedCourseId from original lead and trigger duplicate error
  await expect(
    leadService.updateLead('lead-1', { phone: '+96899999999' })
  ).rejects.toThrow('ERR_CRM_DUPLICATE_LEAD_DETECTED');
});

test('LeadService.updateLead should perform successful update, audit the action, and write outbox event', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    lead: {
      findFirst: vi.fn().mockResolvedValue(null), // no duplicates
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;

  const mockLeadRepo = {
    findById: vi.fn().mockResolvedValue({
      id: 'lead-1',
      phone: '+96890000000',
      email: 'original@example.com',
      branchId: 'branch-1',
      interestedCourseId: 'course-1',
      version: 1,
      leadNumber: 'LD-111',
    }),
    updateLead: vi.fn().mockResolvedValue(null),
  } as any;

  const leadService = new LeadService(mockPrisma, mockLeadRepo, {} as any);

  await leadService.updateLead('lead-1', {
    phone: '+96899999999',
    firstName: 'NewName',
  }, undefined, 'actor-99');

  expect(mockLeadRepo.updateLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({ firstName: 'NewName' }), mockPrisma);
  expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      performedBy: 'actor-99',
      entityType: 'Lead',
      entityId: 'lead-1',
      action: 'Update',
    })
  }));
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      eventType: 'LeadUpdated',
      aggregateType: 'Lead',
      aggregateId: 'lead-1',
    })
  }));
});

test('LeadService.deleteLead should soft-delete the lead, write to audit logs, and dispatch outbox event', async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as any;

  const mockLeadRepo = {
    findById: vi.fn().mockResolvedValue({
      id: 'lead-delete-123',
      leadNumber: 'LD-2026-MCT-55555',
      branchId: 'branch-1',
    }),
    deleteLead: vi.fn().mockResolvedValue(null),
  } as any;

  const leadService = new LeadService(mockPrisma, mockLeadRepo, {} as any);

  await leadService.deleteLead('lead-delete-123', 'actor-1');

  expect(mockLeadRepo.deleteLead).toHaveBeenCalledWith('lead-delete-123', 'actor-1', mockPrisma);
  expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      performedBy: 'actor-1',
      entityType: 'Lead',
      entityId: 'lead-delete-123',
      action: 'Delete',
      branchId: 'branch-1',
    })
  }));
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      eventType: 'LeadDeleted',
      aggregateType: 'Lead',
      aggregateId: 'lead-delete-123',
      payload: { leadId: 'lead-delete-123', leadNumber: 'LD-2026-MCT-55555' },
    })
  }));
});


