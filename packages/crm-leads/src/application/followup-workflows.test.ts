import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { FollowUpApplicationService } from './followup-service';
import { ILeadRepository, IFollowUpRepository } from '../domain/repositories';

describe('FollowUpApplicationService - Workflows & Scheduling', () => {
  let prismaMock: any;
  let leadRepositoryMock: any;
  let followUpRepositoryMock: any;
  let followUpService: FollowUpApplicationService;

  beforeEach(() => {
    prismaMock = {
      $transaction: vi.fn((cb) => cb(prismaMock)),
      outboxEvent: {
        create: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      leadStageHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    leadRepositoryMock = {
      findById: vi.fn(),
      updateStage: vi.fn(),
      updateLead: vi.fn(),
      create: vi.fn(),
      assignCounselor: vi.fn(),
      deleteLead: vi.fn(),
      findAll: vi.fn(),
    } as any;

    followUpRepositoryMock = {
      create: vi.fn(),
      findById: vi.fn(),
      recordOutcome: vi.fn(),
      cancelAllScheduled: vi.fn(),
      findAllScheduledOverdue: vi.fn(),
      findAllForLead: vi.fn(),
    } as any;

    followUpService = new FollowUpApplicationService(
      prismaMock as unknown as PrismaClient,
      followUpRepositoryMock,
      leadRepositoryMock
    );
  });

  describe('scheduleFollowUp', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    it('should schedule follow-up and denormalize nextFollowUpDate on active lead', async () => {
      const lead = { id: 'lead-1', stage: 'New', version: 1, branchId: 'branch-1', counselorId: 'counselor-1', leadNumber: 'LD-001' };
      leadRepositoryMock.findById.mockResolvedValue(lead);
      followUpRepositoryMock.create.mockResolvedValue({ id: 'followup-1', followUpDate: new Date(futureDate), followUpType: 'Call', status: 'Scheduled' });

      await followUpService.scheduleFollowUp('lead-1', {
        followUpDate: futureDate,
        followUpType: 'Call',
        agenda: 'Follow up with student',
      }, 'actor-1');

      // Verify stage transitioned to FollowUp
      expect(leadRepositoryMock.updateStage).toHaveBeenCalledWith('lead-1', 'FollowUp', 1, prismaMock);
      // Verify nextFollowUpDate updated
      expect(leadRepositoryMock.updateLead).toHaveBeenCalledWith('lead-1', {
        nextFollowUpDate: new Date(futureDate),
        version: 2,
      }, prismaMock);
    });

    it('should throw error when scheduling follow-up on terminal lead (Converted)', async () => {
      const lead = { id: 'lead-1', stage: 'Converted', version: 1 };
      leadRepositoryMock.findById.mockResolvedValue(lead);

      await expect(
        followUpService.scheduleFollowUp('lead-1', {
          followUpDate: futureDate,
          followUpType: 'Call',
          agenda: 'Follow up with student',
        }, 'actor-1')
      ).rejects.toThrow('ERR_CRM_INVALID_STAGE_TRANSITION');
    });

    it('should throw error when scheduling follow-up on terminal lead (Lost)', async () => {
      const lead = { id: 'lead-1', stage: 'Lost', version: 1 };
      leadRepositoryMock.findById.mockResolvedValue(lead);

      await expect(
        followUpService.scheduleFollowUp('lead-1', {
          followUpDate: futureDate,
          followUpType: 'Call',
          agenda: 'Follow up with student',
        }, 'actor-1')
      ).rejects.toThrow('ERR_CRM_INVALID_STAGE_TRANSITION');
    });
  });

  describe('recordOutcome', () => {
    it('should verify optimistic concurrency version', async () => {
      const followUp = { id: 'followup-1', leadId: 'lead-1', status: 'Scheduled', counselorId: 'counselor-1', lead: { leadNumber: 'LD-001' } };
      followUpRepositoryMock.findById.mockResolvedValue(followUp);
      followUpRepositoryMock.findAllForLead.mockResolvedValue([]);

      // Mock updateLead to simulate optimistic locking failure
      leadRepositoryMock.updateLead.mockRejectedValue(new Error('ERR_CRM_CONCURRENCY_VIOLATION'));

      await expect(
        followUpService.recordOutcome('followup-1', {
          outcome: 'Busy',
          outcomeNotes: 'Called but the phone was busy for long time.',
          scheduleNext: false,
          version: 1, // wrong/stale version
        }, 'actor-1')
      ).rejects.toThrow('ERR_CRM_CONCURRENCY_VIOLATION');
    });

    it('should recalculate nextFollowUpDate to the next earliest scheduled date', async () => {
      const followUp = { id: 'followup-1', leadId: 'lead-1', status: 'Scheduled', counselorId: 'counselor-1', lead: { leadNumber: 'LD-001' } };
      const dateFar = new Date(Date.now() + 20 * 60 * 1000);
      const dateSoon = new Date(Date.now() + 10 * 60 * 1000);

      followUpRepositoryMock.findById.mockResolvedValue(followUp);
      followUpRepositoryMock.findAllForLead.mockResolvedValue([
        { id: 'followup-1', status: 'Completed', followUpDate: new Date() },
        { id: 'followup-2', status: 'Scheduled', followUpDate: dateFar },
        { id: 'followup-3', status: 'Scheduled', followUpDate: dateSoon },
      ]);

      await followUpService.recordOutcome('followup-1', {
        outcome: 'Busy',
        outcomeNotes: 'Outcome notes are long enough here.',
        scheduleNext: false,
        version: 1,
      }, 'actor-1');

      // earliest scheduled date among active (excluding completed followup-1) should be dateSoon
      expect(leadRepositoryMock.updateLead).toHaveBeenCalledWith('lead-1', {
        nextFollowUpDate: dateSoon,
        version: 1,
      }, prismaMock);
    });

    it('should nullify nextFollowUpDate if no more scheduled follow-ups exist', async () => {
      const followUp = { id: 'followup-1', leadId: 'lead-1', status: 'Scheduled', counselorId: 'counselor-1', lead: { leadNumber: 'LD-001' } };
      followUpRepositoryMock.findById.mockResolvedValue(followUp);
      followUpRepositoryMock.findAllForLead.mockResolvedValue([
        { id: 'followup-1', status: 'Completed', followUpDate: new Date() },
      ]);

      await followUpService.recordOutcome('followup-1', {
        outcome: 'Busy',
        outcomeNotes: 'Outcome notes are long enough here.',
        scheduleNext: false,
        version: 1,
      }, 'actor-1');

      expect(leadRepositoryMock.updateLead).toHaveBeenCalledWith('lead-1', {
        nextFollowUpDate: null,
        version: 1,
      }, prismaMock);
    });
  });
});
