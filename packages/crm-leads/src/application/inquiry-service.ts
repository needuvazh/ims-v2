import { PrismaClient, Prisma } from '@prisma/client';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { IInquiryRepository, ILeadRepository } from '../domain/repositories';
import { IngestInquiryInput, QualifyInquiryInput } from '../domain/lead';

export class InquiryApplicationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly inquiryRepository: IInquiryRepository,
    private readonly leadRepository: ILeadRepository
  ) {}

  async captureInquiry(input: IngestInquiryInput, actorId?: string, tx?: Prisma.TransactionClient) {
    const execute = async (client: Prisma.TransactionClient) => {
      // 1. Duplicate Verification Engine (30-day check)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const existing = await this.inquiryRepository.findByMobileOrEmailInBranch(
        input.branchId,
        input.mobile,
        input.email,
        thirtyDaysAgo,
        client
      );

      let isDuplicate = false;
      let duplicateRefId: string | null = null;
      
      if (existing) {
        if (!input.bypassDuplicateBlock) {
          throw new Error('ERR_CRM_DUPLICATE_LEAD_DETECTED');
        }
        isDuplicate = true;
        duplicateRefId = existing.inquiryNumber;
      }

      // 2. Fetch Branch Code to generate sequential number
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
      const inquiryNumber = `INQ-${currentYear}-${branchCode}-${serial}`;

      // 3. Save Inquiry
      const result = await this.inquiryRepository.create(
        {
          ...input,
          inquiryNumber,
          isDuplicate,
          duplicateRefId,
        },
        client
      );

      // 4. Transactional Outbox Event
      await client.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: input.utmSource ? 'WebsiteInquirySubmitted' : 'InquiryCreated',
          aggregateType: 'Inquiry',
          aggregateId: result.id,
          payload: {
            id: result.id,
            inquiryNumber: result.inquiryNumber,
            firstName: input.firstName,
            lastName: input.lastName,
            mobile: input.mobile,
            email: input.email,
            branchId: input.branchId,
            interestedCourseId: input.interestedCourseId,
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      // 5. Audit Log
      await client.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Inquiry',
          entityId: result.id,
          action: 'Create',
          newValue: {
            inquiryNumber: result.inquiryNumber,
            isDuplicate,
            duplicateRefId,
          },
          branchId: input.branchId,
        },
      });

      return result;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async promoteToLead(inquiryId: string, input: QualifyInquiryInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch and validate Inquiry
      const inquiry = await this.inquiryRepository.findById(inquiryId, tx);
      if (!inquiry) {
        throw new Error('ERR_CRM_INQUIRY_NOT_FOUND');
      }
      if (inquiry.status === 'Qualified') {
        throw new Error('ERR_CRM_INQUIRY_ALREADY_QUALIFIED');
      }

      // 1.5. Counselor validation
      if (input.counselorId) {
        const counselor = await tx.user.findFirst({
          where: { id: input.counselorId, status: 'Active', isDeleted: false },
        });
        if (!counselor) {
          throw new Error('ERR_CRM_COUNSELOR_INACTIVE');
        }
      }

      // 2. Person aggregate resolution (Reuse profile by mobile or email to satisfy unique constraints)
      const personConditions: Prisma.PersonWhereInput[] = [{ mobile: inquiry.mobile }];
      if (inquiry.email) {
        personConditions.push({ email: inquiry.email });
      }

      let person = await tx.person.findFirst({
        where: {
          OR: personConditions,
          isDeleted: false,
        },
      });

      if (!person) {
        person = await tx.person.create({
          data: {
            id: createUuid(randomUUID()),
            firstName: inquiry.firstName,
            lastName: inquiry.lastName,
            mobile: inquiry.mobile,
            isDeleted: false,
          },
        });
      }

      // 3. Generate Lead Number
      const branchCode = inquiry.branch.branchCode;
      const currentYear = new Date().getFullYear();
      const serial = Math.floor(10000 + Math.random() * 90000);
      const leadNumber = `LD-${currentYear}-${branchCode}-${serial}`;

      // 4. Create Lead
      const lead = await this.leadRepository.create(
        {
          branchId: inquiry.branchId,
          firstName: inquiry.firstName,
          lastName: inquiry.lastName,
          email: inquiry.email,
          phone: inquiry.mobile,
          interestedCourseId: input.interestedCourseId,
          source: inquiry.source as any,
          counselorId: input.counselorId || null,
          notes: input.qualificationNotes,
          personId: person.id,
          leadNumber,
          inquiryId,
        },
        tx
      );

      // 5. Update Inquiry Status
      await this.inquiryRepository.updateStatus(inquiryId, 'Qualified', tx);

      // 6. Outbox Events
      await tx.outboxEvent.createMany({
        data: [
          {
            id: createUuid(randomUUID()),
            eventType: 'InquiryQualified',
            aggregateType: 'Inquiry',
            aggregateId: inquiryId,
            payload: { id: inquiryId, leadId: lead.id },
            status: 'Pending',
            availableAt: new Date(),
          },
          {
            id: createUuid(randomUUID()),
            eventType: 'LeadCreated',
            aggregateType: 'Lead',
            aggregateId: lead.id,
            payload: {
              id: lead.id,
              leadNumber: lead.leadNumber,
              personId: person.id,
              branchId: inquiry.branchId,
              firstName: inquiry.firstName,
              lastName: inquiry.lastName,
              phone: inquiry.mobile,
              email: inquiry.email,
              stage: lead.stage,
              counselorId: input.counselorId,
            },
            status: 'Pending',
            availableAt: new Date(),
          },
        ],
      });

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Inquiry',
          entityId: inquiryId,
          action: 'Qualify',
          newValue: {
            leadId: lead.id,
            leadNumber: lead.leadNumber,
            personId: person.id,
          },
          branchId: inquiry.branchId,
        },
      });

      return {
        inquiryId,
        inquiryStatus: 'Qualified',
        leadId: lead.id,
        leadNumber: lead.leadNumber,
        stage: lead.stage,
        qualifiedAt: new Date(),
      };
    });
  }

  async rejectInquiry(inquiryId: string, notes: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const inquiry = await this.inquiryRepository.findById(inquiryId, tx);
      if (!inquiry) {
        throw new Error('ERR_CRM_INQUIRY_NOT_FOUND');
      }
      if (inquiry.status === 'Qualified') {
        throw new Error('ERR_CRM_INQUIRY_ALREADY_QUALIFIED');
      }

      await this.inquiryRepository.updateStatus(inquiryId, 'Rejected', tx);

      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'LeadCrm',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'Inquiry',
          entityId: inquiryId,
          action: 'Reject',
          newValue: { notes },
          branchId: inquiry.branchId,
        },
      });
    });
  }

  async getInquiryById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return this.inquiryRepository.findById(id, client);
  }

  async findAll(
    filters: { branchId?: string; branchIds?: string[]; status?: string; search?: string; counselorId?: string },
    pagination: { page: number; limit: number }
  ) {
    return this.inquiryRepository.findAll(filters, pagination, this.prisma);
  }
}

