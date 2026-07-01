import { PrismaClient, Prisma } from '@prisma/client';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { IFollowUpRepository, ILeadRepository } from '../domain/repositories';
import { ScheduleFollowUpInput, LogFollowUpOutcomeInput } from '../domain/lead';

export class FollowUpApplicationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly followUpRepository: IFollowUpRepository,
    private readonly leadRepository: ILeadRepository
  ) {}

  async scheduleFollowUp(
    leadId: string,
    input: ScheduleFollowUpInput,
    actorId: string,
    tx?: Prisma.TransactionClient
  ) {
    const execute = async (client: Prisma.TransactionClient | PrismaClient) => {
      // 1. Verify Lead exists
      const lead = await this.leadRepository.findById(leadId, client);
      if (!lead) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      // 2. Future date constraint (BR-LEAD-009)
      const scheduleTime = new Date(input.followUpDate).getTime();
      if (scheduleTime <= Date.now() + 300000) {
        throw new Error('ERR_CRM_PAST_FOLLOWUP_DATE');
      }

      // 3. Stage transition blocking & checks
      if (lead.stage === 'Converted' || lead.stage === 'Won' || lead.stage === 'Lost') {
        throw new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
      }

      let targetStage = lead.stage;
      const oldStage = lead.stage;
      if (lead.stage === 'New' || lead.stage === 'Contacted') {
        targetStage = 'FollowUp';
      }

      // 4. Create FollowUp (Scheduled)
      const followUp = await this.followUpRepository.create(
        {
          ...input,
          leadId,
          counselorId: lead.counselorId || actorId, // defaults to actor if lead unassigned
        },
        client
      );

      // 5. Update Lead Stage if needed
      if (targetStage !== oldStage) {
        await this.leadRepository.updateStage(leadId, targetStage, lead.version, client);
        
        // Insert LeadStageHistory
        await client.leadStageHistory.create({
          data: {
            id: createUuid(randomUUID()),
            leadId,
            oldStage: oldStage as any,
            newStage: targetStage as any,
            performedBy: actorId,
          },
        });

        // Emit LeadStageChanged event
        await client.outboxEvent.create({
          data: {
            id: createUuid(randomUUID()),
            eventType: 'LeadStageChanged',
            aggregateType: 'Lead',
            aggregateId: leadId,
            payload: {
              leadId,
              oldStage,
              newStage: targetStage,
              leadNumber: lead.leadNumber,
            },
            status: 'Pending',
            availableAt: new Date(),
          },
        });
      }

      // 6. Update nextFollowUpDate on the lead
      await this.leadRepository.updateLead(
        leadId,
        {
          nextFollowUpDate: new Date(input.followUpDate),
          version: targetStage !== oldStage ? lead.version + 1 : lead.version,
        },
        client
      );

      // 7. Outbox Event (FollowUpScheduled)
      await client.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'FollowUpScheduled',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: {
            id: followUp.id,
            leadId,
            followUpDate: followUp.followUpDate,
            followUpType: followUp.followUpType,
            leadNumber: lead.leadNumber,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      // 8. Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'LeadFollowUp',
          entityId: followUp.id,
          action: 'Schedule',
          newValue: {
            followUpDate: followUp.followUpDate,
            followUpType: followUp.followUpType,
          },
          branchId: lead.branchId,
        },
      });

      return followUp;
    };

    if (tx) {
      return execute(tx);
    } else {
      return this.prisma.$transaction(execute);
    }
  }

  async recordOutcome(
    followUpId: string,
    input: LogFollowUpOutcomeInput,
    actorId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch current follow-up
      const followUp = await this.followUpRepository.findById(followUpId, tx);
      if (!followUp) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      if (followUp.status === 'Completed') {
        throw new Error('Follow-up is already completed');
      }

      // Notes length check
      if (input.outcomeNotes.length < 15) {
        throw new Error('Outcome notes must be at least 15 characters long');
      }

      // 2. Record outcome
      await this.followUpRepository.recordOutcome(followUpId, input.outcome, input.outcomeNotes, tx);

      // 3. Outbox Event (Outcome Recorded / Completed)
      await tx.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'FollowUpCompleted',
          aggregateType: 'Lead',
          aggregateId: followUp.leadId,
          payload: {
            id: followUpId,
            leadId: followUp.leadId,
            outcome: input.outcome,
            leadNumber: followUp.lead.leadNumber,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      let nextFollowUp = null;

      // 4. Optionally schedule next follow-up
      if (input.scheduleNext && input.nextFollowUpDate && input.nextFollowUpType && input.nextFollowUpAgenda) {
        // Enforce BR-LEAD-009 check
        const nextTime = new Date(input.nextFollowUpDate).getTime();
        if (nextTime <= Date.now() + 300000) {
          throw new Error('ERR_CRM_PAST_FOLLOWUP_DATE');
        }

        nextFollowUp = await this.followUpRepository.create(
          {
            followUpDate: input.nextFollowUpDate,
            followUpType: input.nextFollowUpType,
            agenda: input.nextFollowUpAgenda,
            leadId: followUp.leadId,
            counselorId: followUp.counselorId,
          },
          tx
        );

        await tx.outboxEvent.create({
          data: {
            id: createUuid(randomUUID()),
            eventType: 'FollowUpScheduled',
            aggregateType: 'Lead',
            aggregateId: followUp.leadId,
            payload: {
              id: nextFollowUp.id,
              leadId: followUp.leadId,
              followUpDate: nextFollowUp.followUpDate,
              followUpType: nextFollowUp.followUpType,
              leadNumber: followUp.lead.leadNumber,
            },
            status: 'Pending',
            availableAt: new Date(),
          },
        });
      }

      // 5. Recalculate nextFollowUpDate
      const allFollowUps = await this.followUpRepository.findAllForLead(followUp.leadId, tx);
      const scheduledFollowUps = allFollowUps.filter(
        (f: any) => f.status === 'Scheduled' && f.id !== followUpId
      );

      if (nextFollowUp) {
        scheduledFollowUps.push(nextFollowUp as any);
      }

      let recalculatedDate: Date | null = null;
      if (scheduledFollowUps.length > 0) {
        const dates = scheduledFollowUps.map((f: any) => new Date(f.followUpDate).getTime());
        const minDate = Math.min(...dates);
        recalculatedDate = new Date(minDate);
      }

      // 6. Update Lead with nextFollowUpDate and optimistic concurrency version
      await this.leadRepository.updateLead(
        followUp.leadId,
        {
          nextFollowUpDate: recalculatedDate,
          version: input.version,
        },
        tx
      );

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'LeadFollowUp',
          entityId: followUpId,
          action: 'RecordOutcome',
          newValue: {
            outcome: input.outcome,
            notes: input.outcomeNotes,
            nextFollowUpId: nextFollowUp?.id || null,
          },
          branchId: followUp.lead.branchId,
        },
      });

      return {
        completedFollowUpId: followUpId,
        status: 'Completed',
        nextFollowUp: nextFollowUp
          ? {
              followUpId: nextFollowUp.id,
              followUpDate: nextFollowUp.followUpDate,
              status: 'Scheduled',
            }
          : null,
      };
    });
  }

  async getFollowUpById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return this.followUpRepository.findById(id, client);
  }
}

