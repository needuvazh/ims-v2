import { PrismaClient, Prisma } from '@prisma/client';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { ILeadRepository, IFollowUpRepository } from '../domain/repositories';
import { CreateLeadInput, TransitionLeadStageInput, CloseLeadLostInput, LeadStage } from '../domain/lead';

export class LeadService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly leadRepository: ILeadRepository,
    private readonly followUpRepository: IFollowUpRepository
  ) {}

  // 1. Manual Lead Creation
  async createLead(
    input: CreateLeadInput & { bypassDuplicateBlock?: boolean },
    actorId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;

    // Counselor Role Verification
    if (input.counselorId) {
      const counselor = await client.user.findFirst({
        where: { id: input.counselorId, status: 'Active', isDeleted: false },
      });
      if (!counselor) {
        throw new Error('ERR_CRM_COUNSELOR_INACTIVE');
      }
    }

    // Active Lead Duplicate Verification (30-day lookup check)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dupConditions: Prisma.LeadWhereInput[] = [
      { phone: input.phone, interestedCourseId: input.interestedCourseId }
    ];
    if (input.email) {
      dupConditions.push({ email: input.email, interestedCourseId: input.interestedCourseId });
    }

    const existingLead = await client.lead.findFirst({
      where: {
        branchId: input.branchId,
        OR: dupConditions,
        stage: { notIn: ['Converted', 'Lost'] },
        isDeleted: false,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { leadNumber: true },
    });

    if (existingLead) {
      if (!input.bypassDuplicateBlock) {
        throw new Error('ERR_CRM_DUPLICATE_LEAD_DETECTED');
      }
    }

    // Person Resolution & Reuse logic (prevent duplicate key violation on Person.mobile or email)
    const personConditions: Prisma.PersonWhereInput[] = [{ mobile: input.phone }];
    if (input.email) {
      personConditions.push({ email: input.email });
    }

    let person = await client.person.findFirst({
      where: {
        OR: personConditions,
        isDeleted: false,
      },
    });

    if (!person) {
      person = await client.person.create({
        data: {
          id: createUuid(randomUUID()),
          firstName: input.firstName,
          lastName: input.lastName,
          mobile: input.phone,
          email: input.email || null,
          dateOfBirth: input.dateOfBirth || null,
          isDeleted: false,
        },
      });
    } else {
      const personUpdateData: Prisma.PersonUpdateInput = {};
      if (input.email && !person.email) personUpdateData.email = input.email;
      if (input.dateOfBirth && !person.dateOfBirth) personUpdateData.dateOfBirth = input.dateOfBirth;

      if (Object.keys(personUpdateData).length > 0) {
        person = await client.person.update({
          where: { id: person.id },
          data: personUpdateData,
        });
      }
    }

    // Generate Lead Number
    const branch = await client.branch.findUnique({
      where: { id: input.branchId },
      select: { branchCode: true },
    });
    if (!branch) {
      throw new Error('ERR_CRM_BRANCH_SCOPE_VIOLATION');
    }
    const branchCode = branch.branchCode;
    const currentYear = new Date().getFullYear();
    const serial = Math.floor(10000 + Math.random() * 90000);
    const leadNumber = `LD-${currentYear}-${branchCode}-${serial}`;

    const lead = await this.leadRepository.create(
      {
        ...input,
        personId: person.id,
        leadNumber,
      },
      client
    );

    // Outbox Event
    await client.outboxEvent.create({
      data: {
        id: createUuid(randomUUID()),
        eventType: 'LeadCreated',
        aggregateType: 'Lead',
        aggregateId: lead.id,
        payload: {
          id: lead.id,
          leadNumber: lead.leadNumber,
          personId: person.id,
          branchId: input.branchId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          stage: lead.stage,
          counselorId: input.counselorId,
        },
        status: 'Pending',
        availableAt: new Date(),
      },
    });

    // Audit Log
    await client.auditLog.create({
      data: {
        id: createUuid(randomUUID()),
        module: 'LeadCrm',
        performedBy: actorId || null,
        performedAt: new Date(),
        entityType: 'Lead',
        entityId: lead.id,
        action: 'Create',
        newValue: {
          leadNumber: lead.leadNumber,
          personId: person.id,
        },
        branchId: input.branchId,
      },
    });

    return lead;
  }

  // 2. Assign Counselor
  async assignCounselor(leadId: string, counselorId: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lead = await this.leadRepository.findById(leadId, tx);
      if (!lead) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      // Counselor verification
      const counselor = await tx.user.findFirst({
        where: { id: counselorId, status: 'Active', isDeleted: false },
      });
      if (!counselor) {
        throw new Error('ERR_CRM_COUNSELOR_INACTIVE');
      }

      // Update lead
      await this.leadRepository.assignCounselor(leadId, counselorId, tx);

      // Reassign all pending follow-ups to the new counselor
      await tx.leadFollowUp.updateMany({
        where: { leadId, status: 'Scheduled' },
        data: { counselorId }
      });

      // Appends an assignment log to FollowUp (Type: SystemAssignment, Outcome: Reassigned, Notes: "Lead reassigned")
      await tx.leadFollowUp.create({
        data: {
          id: createUuid(randomUUID()),
          leadId,
          counselorId,
          followUpDate: new Date(),
          followUpType: 'Email', // Fallback type
          notes: 'Lead reassigned by system',
          outcome: 'Reassigned',
          status: 'Completed',
        },
      });

      // Outbox Event
      await tx.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'LeadAssigned',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: { leadId, counselorId, leadNumber: lead.leadNumber },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Lead',
          entityId: leadId,
          action: 'AssignCounselor',
          oldValue: { counselorId: lead.counselorId },
          newValue: { counselorId },
          branchId: lead.branchId,
        },
      });
    });
  }

  // 3. Stage Transitions with Optimistic Concurrency and State Machine Validation
  async updateStage(leadId: string, input: TransitionLeadStageInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lead = await this.leadRepository.findById(leadId, tx);
      if (!lead) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      const currentStage: LeadStage = lead.stage;
      const targetStage: LeadStage = input.newStage;

      // State machine validation limits
      if (currentStage === 'Converted') {
        throw new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
      }
      if (currentStage === 'Lost' && (targetStage !== 'New' && targetStage !== 'FollowUp')) {
        throw new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
      }
      if (currentStage === 'Won' && targetStage === 'Lost') {
        throw new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
      }

      // Update lead stage in repository (which enforces version-matching checks)
      await this.leadRepository.updateStage(leadId, targetStage, input.version, tx);

      // Write LeadStageHistory
      await tx.leadStageHistory.create({
        data: {
          id: createUuid(randomUUID()),
          leadId,
          oldStage: currentStage as any,
          newStage: targetStage as any,
          performedBy: actorId || '00000000-0000-0000-0000-000000000000',
        },
      });

      // Write Outbox Event
      await tx.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'LeadStageUpdated',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: { leadId, oldStage: currentStage, newStage: targetStage, leadNumber: lead.leadNumber },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Lead',
          entityId: leadId,
          action: 'UpdateStage',
          oldValue: { stage: currentStage },
          newValue: { stage: targetStage, notes: input.transitionNotes },
          branchId: lead.branchId,
        },
      });
    });
  }

  // 4. Close Lead as Lost
  async closeLeadLost(leadId: string, input: CloseLeadLostInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lead = await this.leadRepository.findById(leadId, tx);
      if (!lead) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      if (lead.stage === 'Converted' || lead.stage === 'Won') {
        throw new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
      }

      // Lost reason notes length constraint check
      if (!input.lostReasonNotes || input.lostReasonNotes.length < 15) {
        throw new Error('ERR_CRM_LOST_REASON_REQUIRED');
      }

      // Update lead attributes and nullify nextFollowUpDate
      await this.leadRepository.updateLead(
        leadId,
        {
          lostReasonCode: input.lostReasonCode,
          lostReasonNotes: input.lostReasonNotes,
          nextFollowUpDate: null,
          version: lead.version, // optimistic lock
        },
        tx
      );

      // Change Stage to Lost
      await this.leadRepository.updateStage(leadId, 'Lost', lead.version + 1, tx);

      // Write LeadStageHistory
      await tx.leadStageHistory.create({
        data: {
          id: createUuid(randomUUID()),
          leadId,
          oldStage: lead.stage as any,
          newStage: 'Lost',
          lostReasonCode: input.lostReasonCode,
          lostReasonNotes: input.lostReasonNotes,
          performedBy: actorId || '00000000-0000-0000-0000-000000000000',
        },
      });

      // Cancel all outstanding Scheduled follow-ups
      const cancelledCount = await this.followUpRepository.cancelAllScheduled(leadId, tx);

      // Outbox Event
      await tx.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'LeadLost',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: { leadId, lostReasonCode: input.lostReasonCode, leadNumber: lead.leadNumber },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Lead',
          entityId: leadId,
          action: 'CloseLost',
          newValue: { stage: 'Lost', lostReasonCode: input.lostReasonCode, cancelledFollowUpsCount: cancelledCount },
          branchId: lead.branchId,
        },
      });

      return {
        leadId,
        stage: 'Lost',
        lostReasonCode: input.lostReasonCode,
        cancelledFollowUpsCount: cancelledCount,
        closedAt: new Date(),
      };
    });
  }

  // 5. Decoupled Admissions Handoff (Convert Lead)
  // This verifies Won preconditions inside CRM context boundary and transitions stage to Converted.
  async convertLead(leadId: string, documentLinks: string[], tx: Prisma.TransactionClient, actorId?: string) {
    const lead = await this.leadRepository.findById(leadId, tx);
    if (!lead) {
      throw new Error('ERR_CRM_LEAD_NOT_FOUND');
    }
    if (lead.stage === 'Converted') {
      throw new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
    }

    // Validate Won Preconditions (BR-LEAD-007 / FRD Part 7 Section 1.3)
    if (!lead.email) {
      throw new Error('ERR_CRM_WON_PRECONDITIONS_MISSED');
    }
    // Check birthdate on linked Person record
    if (!lead.person || !lead.person.dateOfBirth) {
      throw new Error('ERR_CRM_WON_PRECONDITIONS_MISSED');
    }
    // Check identity document upload presence (must supply at least 1 url link)
    if (!documentLinks || documentLinks.length === 0) {
      throw new Error('ERR_CRM_WON_PRECONDITIONS_MISSED');
    }

    // 1. Transition Stage to Won
    await this.leadRepository.updateStage(leadId, 'Won', lead.version, tx);

    await tx.leadStageHistory.create({
      data: {
        id: createUuid(randomUUID()),
        leadId,
        oldStage: lead.stage as any,
        newStage: 'Won',
        performedBy: actorId || '00000000-0000-0000-0000-000000000000',
      },
    });

    // 2. Perform conversion / handoff transition to Converted
    await this.leadRepository.updateStage(leadId, 'Converted', lead.version + 1, tx);

    await tx.leadStageHistory.create({
      data: {
        id: createUuid(randomUUID()),
        leadId,
        oldStage: 'Won',
        newStage: 'Converted',
        performedBy: actorId || '00000000-0000-0000-0000-000000000000',
      },
    });

    // 3. Nullify nextFollowUpDate
    await this.leadRepository.updateLead(
      leadId,
      {
        nextFollowUpDate: null,
        version: lead.version + 2,
      },
      tx
    );

    // Cancel all outstanding Scheduled follow-ups
    await this.followUpRepository.cancelAllScheduled(leadId, tx);

    // 3. Write Outbox Events
    await tx.outboxEvent.createMany({
      data: [
        {
          id: createUuid(randomUUID()),
          eventType: 'LeadWon',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: { leadId, leadNumber: lead.leadNumber },
          status: 'Pending',
          availableAt: new Date(),
        },
        {
          id: createUuid(randomUUID()),
          eventType: 'LeadConverted',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: { leadId, leadNumber: lead.leadNumber, studentEmail: lead.email },
          status: 'Pending',
          availableAt: new Date(),
        },
      ],
    });

    return lead;
  }

  async getLeadById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return this.leadRepository.findById(id, client);
  }

  async findAll(
    filters: { branchId?: string; branchIds?: string[]; stage?: LeadStage; counselorId?: string; search?: string },
    pagination: { page: number; limit: number }
  ) {
    return this.leadRepository.findAll(filters, pagination, this.prisma);
  }

  async updateLead(leadId: string, data: any, tx?: Prisma.TransactionClient, actorId?: string) {
    const client = tx || this.prisma;
    const execute = async (client: Prisma.TransactionClient) => {
      const originalLead = await this.leadRepository.findById(leadId, client);
      if (!originalLead) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      // Resolve original lead state to perform robust duplicate check on partial updates
      if (data.phone || data.email || data.branchId || data.interestedCourseId) {
        const checkPhone = data.phone !== undefined ? data.phone : originalLead.phone;
        const checkEmail = data.email !== undefined ? data.email : originalLead.email;
        const checkBranch = data.branchId !== undefined ? data.branchId : originalLead.branchId;
        const checkCourse = data.interestedCourseId !== undefined ? data.interestedCourseId : originalLead.interestedCourseId;

        // Only check if fields actually changed to avoid false warnings on unchanged values
        const phoneChanged = data.phone !== undefined && data.phone !== originalLead.phone;
        const emailChanged = data.email !== undefined && data.email !== originalLead.email;
        const branchChanged = data.branchId !== undefined && data.branchId !== originalLead.branchId;
        const courseChanged = data.interestedCourseId !== undefined && data.interestedCourseId !== originalLead.interestedCourseId;

        if (phoneChanged || emailChanged || branchChanged || courseChanged) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          
          // Build duplicate check conditions
          const dupConditions: Prisma.LeadWhereInput[] = [];
          if (checkPhone) {
            dupConditions.push({ phone: checkPhone, interestedCourseId: checkCourse });
          }
          if (checkEmail) {
            dupConditions.push({ email: checkEmail, interestedCourseId: checkCourse });
          }

          if (dupConditions.length > 0) {
            const existingLead = await client.lead.findFirst({
              where: {
                branchId: checkBranch,
                id: { not: leadId },
                OR: dupConditions,
                stage: { notIn: ['Converted', 'Lost'] },
                isDeleted: false,
                createdAt: { gte: thirtyDaysAgo },
              },
              select: { id: true },
            });

            if (existingLead && !data.bypassDuplicateBlock) {
              throw new Error('ERR_CRM_DUPLICATE_LEAD_DETECTED');
            }
          }
        }
      }

      await this.leadRepository.updateLead(leadId, data, client);

      // Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Lead',
          entityId: leadId,
          action: 'Update',
          oldValue: {
            firstName: originalLead.firstName,
            lastName: originalLead.lastName,
            email: originalLead.email,
            phone: originalLead.phone,
            notes: originalLead.notes,
            branchId: originalLead.branchId,
            interestedCourseId: originalLead.interestedCourseId,
          },
          newValue: {
            firstName: data.firstName !== undefined ? data.firstName : originalLead.firstName,
            lastName: data.lastName !== undefined ? data.lastName : originalLead.lastName,
            email: data.email !== undefined ? data.email : originalLead.email,
            phone: data.phone !== undefined ? data.phone : originalLead.phone,
            notes: data.notes !== undefined ? data.notes : originalLead.notes,
            branchId: data.branchId !== undefined ? data.branchId : originalLead.branchId,
            interestedCourseId: data.interestedCourseId !== undefined ? data.interestedCourseId : originalLead.interestedCourseId,
          },
          branchId: originalLead.branchId,
        },
      });

      // Outbox Event
      await client.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'LeadUpdated',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: {
            leadId,
            leadNumber: originalLead.leadNumber,
            firstName: data.firstName !== undefined ? data.firstName : originalLead.firstName,
            lastName: data.lastName !== undefined ? data.lastName : originalLead.lastName,
            phone: data.phone !== undefined ? data.phone : originalLead.phone,
            email: data.email !== undefined ? data.email : originalLead.email,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async deleteLead(leadId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const execute = async (client: Prisma.TransactionClient) => {
      const lead = await this.leadRepository.findById(leadId, client);
      if (!lead) {
        throw new Error('ERR_CRM_LEAD_NOT_FOUND');
      }

      await this.leadRepository.deleteLead(leadId, actorId, client);

      // Audit deletion
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId,
          performedAt: new Date(),
          entityType: 'Lead',
          entityId: leadId,
          action: 'Delete',
          newValue: { isDeleted: true, status: 'Archived' },
          branchId: lead.branchId,
        },
      });

      // Write Outbox Event
      await client.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'LeadDeleted',
          aggregateType: 'Lead',
          aggregateId: leadId,
          payload: { leadId, leadNumber: lead.leadNumber },
          status: 'Pending',
          availableAt: new Date(),
        },
      });
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }
}


