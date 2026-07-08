import {
  PrismaClient,
  CompletionApproval as PrismaCompletionApproval,
} from '@prisma/client';
import { CompletionApprovalRepository } from '../../domain/interfaces/CompletionApprovalRepository';
import {
  CompletionApproval,
  ApprovalLevel,
  ApprovalStatus,
} from '../../domain/aggregates/CompletionApproval';

export class PrismaCompletionApprovalRepository implements CompletionApprovalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CompletionApproval | null> {
    const record = await this.prisma.completionApproval.findUnique({
      where: { id, isDeleted: false },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByCompletionId(
    completionId: string,
  ): Promise<CompletionApproval[]> {
    const records = await this.prisma.completionApproval.findMany({
      where: {
        courseCompletionId: completionId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    return records.map(this.toDomain);
  }

  async findByCompletionAndLevel(
    completionId: string,
    level: ApprovalLevel,
  ): Promise<CompletionApproval | null> {
    const record = await this.prisma.completionApproval.findFirst({
      where: {
        courseCompletionId: completionId,
        approvalLevel: level,
        isDeleted: false,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByActorAndStatus(
    actorId: string,
    status: ApprovalStatus,
  ): Promise<CompletionApproval[]> {
    const records = await this.prisma.completionApproval.findMany({
      where: {
        actorId,
        status,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(this.toDomain);
  }

  async save(approval: CompletionApproval): Promise<void> {
    await this.prisma.completionApproval.upsert({
      where: { id: approval.id },
      update: this.toPrismaUpdate(approval),
      create: this.toPrismaCreate(approval),
    });
  }

  async saveMany(approvals: CompletionApproval[]): Promise<void> {
    await this.prisma.$transaction(
      approvals.map((approval) =>
        this.prisma.completionApproval.upsert({
          where: { id: approval.id },
          update: this.toPrismaUpdate(approval),
          create: this.toPrismaCreate(approval),
        }),
      ),
    );
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.completionApproval.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  private toDomain(record: PrismaCompletionApproval): CompletionApproval {
    return {
      id: record.id,
      courseCompletionId: record.courseCompletionId,
      approvalLevel: record.approvalLevel as ApprovalLevel,
      status: record.status as ApprovalStatus,
      actorId: record.actorId,
      actionDate: record.actionDate,
      remarks: record.remarks,
      version: record.version,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      deletedAt: record.deletedAt,
      deletedBy: record.deletedBy,
      isDeleted: record.isDeleted,
    };
  }

  private toPrismaCreate(approval: CompletionApproval) {
    return {
      id: approval.id,
      courseCompletionId: approval.courseCompletionId,
      approvalLevel: approval.approvalLevel,
      status: approval.status,
      actorId: approval.actorId,
      actionDate: approval.actionDate,
      remarks: approval.remarks,
      version: approval.version,
      createdAt: approval.createdAt,
      createdBy: approval.createdBy,
      isDeleted: approval.isDeleted,
    };
  }

  private toPrismaUpdate(approval: CompletionApproval) {
    return {
      approvalLevel: approval.approvalLevel,
      status: approval.status,
      actorId: approval.actorId,
      actionDate: approval.actionDate,
      remarks: approval.remarks,
      version: approval.version,
      updatedAt: approval.updatedAt,
      updatedBy: approval.updatedBy,
      deletedAt: approval.deletedAt,
      deletedBy: approval.deletedBy,
      isDeleted: approval.isDeleted,
    };
  }
}
