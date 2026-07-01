import { Prisma } from '@prisma/client';
import { IngestInquiryInput, CreateLeadInput, LeadStage, ScheduleFollowUpInput } from './lead';

export interface IInquiryRepository {
  create(
    data: IngestInquiryInput & { inquiryNumber: string; isDuplicate?: boolean; duplicateRefId?: string | null; counselorId?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<{
    id: string;
    inquiryNumber: string;
    status: string;
    isDuplicate: boolean;
    duplicateRefId: string | null;
    createdAt: Date;
  }>;

  findById(id: string, tx?: Prisma.TransactionClient): Promise<any>;

  findByMobileOrEmailInBranch(
    branchId: string,
    mobile: string,
    email: string | null | undefined,
    since: Date,
    tx?: Prisma.TransactionClient
  ): Promise<any>;

  updateStatus(id: string, status: string, tx?: Prisma.TransactionClient): Promise<void>;

  findAll(
    filters: { branchId?: string; status?: string; search?: string; counselorId?: string; branchIds?: string[] },
    pagination: { page: number; limit: number },
    tx?: Prisma.TransactionClient
  ): Promise<{ items: any[]; total: number }>;
}

export interface ILeadRepository {
  create(
    data: CreateLeadInput & { personId: string; leadNumber: string; inquiryId?: string | null },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; leadNumber: string; stage: LeadStage; createdAt: Date }>;

  findById(id: string, tx?: Prisma.TransactionClient): Promise<any>;

  updateStage(
    id: string,
    stage: LeadStage,
    version: number,
    tx?: Prisma.TransactionClient
  ): Promise<{ version: number }>;

  assignCounselor(id: string, counselorId: string, tx?: Prisma.TransactionClient): Promise<void>;

  updateLead(
    id: string,
    data: Partial<CreateLeadInput> & { lostReasonCode?: string | null; lostReasonNotes?: string | null; version?: number; nextFollowUpDate?: Date | null },
    tx?: Prisma.TransactionClient
  ): Promise<void>;

  deleteLead(id: string, deletedBy: string, tx?: Prisma.TransactionClient): Promise<void>;

  findAll(
    filters: { branchId?: string; stage?: LeadStage; counselorId?: string; search?: string; branchIds?: string[] },
    pagination: { page: number; limit: number },
    tx?: Prisma.TransactionClient
  ): Promise<{ items: any[]; total: number }>;
}

export interface IFollowUpRepository {
  create(
    data: ScheduleFollowUpInput & { leadId: string; counselorId: string },
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; followUpDate: Date; followUpType: string; status: string }>;

  findById(id: string, tx?: Prisma.TransactionClient): Promise<any>;

  recordOutcome(
    id: string,
    outcome: string,
    notes: string,
    tx?: Prisma.TransactionClient
  ): Promise<void>;

  cancelAllScheduled(leadId: string, tx?: Prisma.TransactionClient): Promise<number>;

  findAllScheduledOverdue(since: Date, tx?: Prisma.TransactionClient): Promise<any[]>;

  findAllForLead(leadId: string, tx?: Prisma.TransactionClient): Promise<any[]>;
}
