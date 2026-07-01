import { PrismaClient, Prisma } from '@prisma/client';
import { ILeadRepository } from '../domain/repositories';
import { CreateLeadInput, LeadStage } from '../domain/lead';

export class LeadRepository implements ILeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateLeadInput & { personId: string; leadNumber: string; inquiryId?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; leadNumber: string; stage: LeadStage; createdAt: Date }> {
    const client = tx || this.prisma;
    const lead = await client.lead.create({
      data: {
        leadNumber: data.leadNumber,
        personId: data.personId,
        branchId: data.branchId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone,
        stage: 'New',
        source: data.source as any,
        counselorId: data.counselorId || null,
        interestedCourseId: data.interestedCourseId,
        notes: data.notes || null,
        inquiryId: data.inquiryId || null,
        version: 1,
        status: 'Active',
      },
      select: {
        id: true,
        leadNumber: true,
        stage: true,
        createdAt: true,
      },
    });
    return lead as any;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return null;
    }
    const client = tx || this.prisma;
    return client.lead.findUnique({
      where: { id, isDeleted: false },
      include: {
        person: true,
        branch: { select: { branchName: true, branchCode: true } },
        counselor: { select: { username: true } },
        interestedCourse: { select: { nameEnglish: true } },
        campaign: true,
        inquiry: true,
        followUps: {
          where: { isDeleted: false },
          orderBy: { followUpDate: 'asc' },
        },
      },
    });
  }

  async updateStage(
    id: string,
    stage: LeadStage,
    version: number,
    tx?: Prisma.TransactionClient
  ): Promise<{ version: number }> {
    const client = tx || this.prisma;
    
    // Perform optimistic concurrency check
    const result = await client.lead.updateMany({
      where: { id, version, isDeleted: false },
      data: {
        stage: stage as any,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new Error('ERR_CRM_CONCURRENCY_VIOLATION');
    }

    return { version: version + 1 };
  }

  async assignCounselor(id: string, counselorId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.lead.update({
      where: { id },
      data: { counselorId },
    });
  }

  async updateLead(
    id: string,
    data: Partial<CreateLeadInput> & { lostReasonCode?: string | null; lostReasonNotes?: string | null; version?: number; nextFollowUpDate?: Date | null },
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || this.prisma;
    const { version, ...updateData } = data;

    const whereClause: Prisma.LeadWhereUniqueInput = { id };
    
    const updatePayload: Prisma.LeadUncheckedUpdateInput = {};

    if (updateData.firstName !== undefined) updatePayload.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) updatePayload.lastName = updateData.lastName;
    if (updateData.email !== undefined) updatePayload.email = updateData.email || null;
    if (updateData.phone !== undefined) updatePayload.phone = updateData.phone;
    if (updateData.notes !== undefined) updatePayload.notes = updateData.notes || null;
    if (updateData.lostReasonCode !== undefined) updatePayload.lostReasonCode = updateData.lostReasonCode || null;
    if (updateData.lostReasonNotes !== undefined) updatePayload.lostReasonNotes = updateData.lostReasonNotes || null;
    if (updateData.branchId !== undefined) updatePayload.branchId = updateData.branchId;
    if (updateData.source !== undefined) updatePayload.source = updateData.source;
    if (updateData.nextFollowUpDate !== undefined) updatePayload.nextFollowUpDate = updateData.nextFollowUpDate;

    // Sync Person details to prevent profile drift and unique constraint violations
    const currentLead = await client.lead.findUnique({
      where: { id },
      select: { personId: true, phone: true, email: true },
    });

    if (currentLead) {
      let targetPersonId = currentLead.personId;

      if (updateData.phone && updateData.phone !== currentLead.phone) {
        // Check if another person already has this phone number
        const existingPerson = await client.person.findFirst({
          where: { mobile: updateData.phone, isDeleted: false },
          select: { id: true },
        });

        if (existingPerson) {
          // Re-link the lead to this existing person record
          targetPersonId = existingPerson.id;
          updatePayload.personId = existingPerson.id;
        } else {
          // Update the current person's mobile number
          await client.person.update({
            where: { id: currentLead.personId },
            data: { mobile: updateData.phone },
          });
        }
      }

      // Sync name, email, and DOB updates to the target Person record
      const personUpdateData: Prisma.PersonUpdateInput = {};
      if (updateData.firstName) personUpdateData.firstName = updateData.firstName;
      if (updateData.lastName) personUpdateData.lastName = updateData.lastName;
      if (updateData.email !== undefined) personUpdateData.email = updateData.email || null;
      if (updateData.dateOfBirth !== undefined) personUpdateData.dateOfBirth = updateData.dateOfBirth || null;

      if (Object.keys(personUpdateData).length > 0) {
        await client.person.update({
          where: { id: targetPersonId },
          data: personUpdateData,
        });
      }
    }

    if (updateData.interestedCourseId) {
      updatePayload.interestedCourseId = updateData.interestedCourseId;
    }
    if (updateData.counselorId !== undefined) {
      updatePayload.counselorId = updateData.counselorId || null;
    }

    if (version !== undefined) {
      // Enforce optimistic lock on general updates
      const result = await client.lead.updateMany({
        where: { id, version, isDeleted: false },
        data: {
          ...updatePayload,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new Error('ERR_CRM_CONCURRENCY_VIOLATION');
      }
    } else {
      await client.lead.update({
        where: whereClause,
        data: updatePayload,
      });
    }
  }

  async deleteLead(id: string, deletedBy: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.lead.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        status: 'Archived',
        nextFollowUpDate: null,
      },
    });

    // Cascade soft-delete active child follow-ups
    await client.leadFollowUp.updateMany({
      where: { leadId: id, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        status: 'Cancelled',
      },
    });
  }

  async findAll(
    filters: { branchId?: string; stage?: LeadStage; counselorId?: string; search?: string; branchIds?: string[] },
    pagination: { page: number; limit: number },
    tx?: Prisma.TransactionClient
  ): Promise<{ items: any[]; total: number }> {
    const client = tx || this.prisma;
    const where: Prisma.LeadWhereInput = { isDeleted: false };

    if (filters.branchId) {
      where.branchId = filters.branchId;
    } else if (filters.branchIds && filters.branchIds.length > 0) {
      where.branchId = { in: filters.branchIds };
    }

    if (filters.stage) {
      where.stage = filters.stage as any;
    }

    if (filters.counselorId) {
      where.counselorId = filters.counselorId;
    }

    if (filters.search) {
      const searchVal = filters.search.trim();
      where.OR = [
        { firstName: { contains: searchVal, mode: 'insensitive' } },
        { lastName: { contains: searchVal, mode: 'insensitive' } },
        { phone: { contains: searchVal, mode: 'insensitive' } },
        { email: { contains: searchVal, mode: 'insensitive' } },
        { leadNumber: { contains: searchVal, mode: 'insensitive' } },
      ];
    }

    const total = await client.lead.count({ where });
    const items = await client.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        person: true,
        branch: { select: { branchName: true, branchCode: true } },
        counselor: { select: { username: true } },
        interestedCourse: { select: { nameEnglish: true } },
      },
    });

    return { items, total };
  }
}
