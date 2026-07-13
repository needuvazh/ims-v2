import { PrismaClient, Prisma } from "@prisma/client";
import { DomainError } from "@ims/shared-kernel";
import {
  CreateCorporateSalesLeadInput,
  LogMarketingVisitInput,
  CreateFollowUpInput,
} from "../domain/schemas";

export class CorporateSalesService {
  constructor(private readonly prisma: PrismaClient) {}

  async createCorporateSalesLead(input: CreateCorporateSalesLeadInput, actorId: string | null = null) {
    if (input.expectedCloseDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
      throw new DomainError("invalid_value", "Expected close date cannot be in the past", {
        errorCode: "ERR_CSQ_INVALID_CLOSE_DATE",
      });
    }

    return await this.prisma.corporateSalesLead.create({
      data: {
        corporateAccountId: input.corporateAccountId,
        leadId: input.leadId,
        salesOwnerId: input.salesOwnerId,
        branchId: input.branchId,
        stage: input.stage,
        expectedValue: new Prisma.Decimal(input.expectedValue),
        expectedCloseDate: input.expectedCloseDate,
        createdBy: actorId,
      },
    });
  }

  async logMarketingVisit(input: LogMarketingVisitInput, actorId: string | null = null) {
    if (input.meetingDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
      throw new DomainError("invalid_value", "Meeting date cannot be in the past", {
        errorCode: "ERR_CSQ_VISIT_PAST_DATE",
      });
    }

    return await this.prisma.corporateMarketingVisit.create({
      data: {
        corporateSalesLeadId: input.corporateSalesLeadId,
        corporateAccountId: input.corporateAccountId,
        companyNameSnapshot: input.companyNameSnapshot,
        contactPersonNameSnapshot: input.contactPersonNameSnapshot,
        contactNumberSnapshot: input.contactNumberSnapshot,
        emailSnapshot: input.emailSnapshot,
        meetingDate: input.meetingDate,
        discussionNotes: input.discussionNotes,
        coursesDiscussed: input.coursesDiscussed,
        expectedCandidates: input.expectedCandidates,
        expectedTrainingDate: input.expectedTrainingDate,
        visitOutcome: input.visitOutcome,
        branchId: input.branchId,
        createdBy: actorId,
      },
    });
  }

  async createFollowUp(input: CreateFollowUpInput, actorId: string | null = null) {
    if (input.followUpDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
      throw new DomainError("invalid_value", "Follow-up date cannot be in the past", {
        errorCode: "ERR_CSQ_FOLLOWUP_PAST_DATE",
      });
    }

    return await this.prisma.corporateSalesFollowUp.create({
      data: {
        corporateSalesLeadId: input.corporateSalesLeadId,
        assignedToUserId: input.assignedToUserId,
        followUpDate: input.followUpDate,
        followUpType: input.followUpType,
        notes: input.notes,
        outcome: input.outcome,
        nextFollowUpDate: input.nextFollowUpDate,
        status: input.status,
        branchId: input.branchId,
        createdBy: actorId,
      },
    });
  }

  async getLeads(branchId?: string) {
    return await this.prisma.corporateSalesLead.findMany({
      where: {
        branchId: branchId ? branchId : undefined,
        isDeleted: false,
      },
      include: {
        corporateAccount: true,
        visits: true,
        followUps: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getLeadDetails(leadId: string) {
    const lead = await this.prisma.corporateSalesLead.findUnique({
      where: { id: leadId },
      include: {
        corporateAccount: true,
        branch: {
          include: {
            institute: true,
          },
        },
        visits: { where: { isDeleted: false }, orderBy: { meetingDate: "desc" } },
        followUps: { where: { isDeleted: false }, orderBy: { followUpDate: "desc" } },
        quotations: { where: { isDeleted: false }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!lead || lead.isDeleted) {
      throw new DomainError("not_found", "Corporate Sales Lead not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    return lead;
  }
}
