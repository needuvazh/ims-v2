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

      if (lead.stage === 'Converted') {
        throw new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
      }

      // Lost reason notes length constraint check
      if (!input.lostReasonNotes || input.lostReasonNotes.length < 15) {
        throw new Error('ERR_CRM_LOST_REASON_REQUIRED');
      }

      // Update lead attributes
      await this.leadRepository.updateLead(
        leadId,
        {
          lostReasonCode: input.lostReasonCode,
          lostReasonNotes: input.lostReasonNotes,
          version: lead.version, // optimistic lock
        },
        tx
      );

      // Change Stage to Lost
      await this.leadRepository.updateStage(leadId, 'Lost', lead.version + 1, tx);

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
  async convertLead(leadId: string, documentLinks: string[], tx: Prisma.TransactionClient) {
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

    // 2. Perform conversion / handoff transition to Converted
    await this.leadRepository.updateStage(leadId, 'Converted', lead.version + 1, tx);

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
          eventType: 'LeadConvertedToAdmission',
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

  async updateLead(leadId: string, data: any, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    // Check for duplicate leads before updating if branchId, phone, email, and interestedCourseId are modified
    if (data.branchId && data.phone && data.interestedCourseId) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dupConditions: Prisma.LeadWhereInput[] = [
        { phone: data.phone, interestedCourseId: data.interestedCourseId }
      ];
      if (data.email) {
        dupConditions.push({ email: data.email, interestedCourseId: data.interestedCourseId });
      }

      const existingLead = await client.lead.findFirst({
        where: {
          id: { not: leadId },
          branchId: data.branchId,
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

    return this.leadRepository.updateLead(leadId, data, client);
  }

  async deleteLead(leadId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return this.leadRepository.deleteLead(leadId, actorId, client);
  }
}


