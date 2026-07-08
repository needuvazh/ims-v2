import { PrismaClient } from '@prisma/client';
import { DomainError, createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';
import { PrismaLeaveRepository } from '../infrastructure/prisma-leave-repository';
import {
  CreateLeaveRequestSchema,
  type CreateLeaveRequestInput,
  type LeaveRequestRecord,
  type LeaveStatus,
} from '../domain/leave';

export type AuthContext = {
  actorId?: string | null;
  branchId?: string | null;
  permissions: string[];
  allowedBranchIds?: string[];
};

function ensurePermission(context: AuthContext, permission: string) {
  if (!context.permissions.includes(permission)) {
    throw new DomainError(
      'forbidden',
      `Access denied: missing permission '${permission}'.`,
    );
  }
}

function ensureBranchScope(context: AuthContext, branchId: string) {
  if (
    context.allowedBranchIds &&
    context.allowedBranchIds.length > 0 &&
    !context.allowedBranchIds.includes(branchId)
  ) {
    throw new DomainError(
      'branch_scope_violation',
      'Access denied: branch is outside allowed scope.',
    );
  }
}

export class LeaveManagementService {
  private readonly repository: PrismaLeaveRepository;

  constructor(
    private readonly prisma: PrismaClient,
    repository?: PrismaLeaveRepository,
  ) {
    this.repository = repository || new PrismaLeaveRepository(prisma);
  }

  async applyLeave(
    input: CreateLeaveRequestInput,
    context: AuthContext,
  ): Promise<LeaveRequestRecord> {
    ensurePermission(context, 'leave.apply');
    ensureBranchScope(context, input.branchId);

    // Validate using Zod domain rules
    const parsed = CreateLeaveRequestSchema.parse(input);

    const leaveId = createUuid(randomUUID());
    const actorId = context.actorId || null;

    const record = await this.prisma.$transaction(async (tx) => {
      const repo = new PrismaLeaveRepository(tx as any);
      const leave = await repo.create({
        id: leaveId,
        personId: parsed.personId,
        branchId: parsed.branchId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        isFullDay: parsed.isFullDay,
        leaveType: parsed.leaveType,
        reason: parsed.reason,
        createdBy: actorId,
      });

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'Faculty',
          performedBy: actorId,
          performedAt: new Date(),
          entityType: 'LeaveRequest',
          entityId: leaveId,
          action: 'Create',
          newValue: {
            personId: parsed.personId,
            branchId: parsed.branchId,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            leaveType: parsed.leaveType,
            status: 'Pending',
          },
        },
      });

      return leave;
    });

    return record;
  }

  async approveLeave(
    id: string,
    context: AuthContext,
  ): Promise<LeaveRequestRecord> {
    ensurePermission(context, 'leave.approve');

    const leave = await this.repository.findById(id);
    if (!leave) {
      throw new DomainError('not_found', 'Leave request not found.');
    }

    ensureBranchScope(context, leave.branchId);

    if (leave.status !== 'Pending') {
      throw new DomainError(
        'invalid_value',
        `Cannot approve a leave request in status: ${leave.status}`,
      );
    }

    const actorId = context.actorId || null;

    const record = await this.prisma.$transaction(async (tx) => {
      const repo = new PrismaLeaveRepository(tx as any);
      const updated = await repo.updateStatus(id, 'Approved', actorId);

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'Faculty',
          performedBy: actorId,
          performedAt: new Date(),
          entityType: 'LeaveRequest',
          entityId: id,
          action: 'Approve',
          oldValue: { status: 'Pending' },
          newValue: { status: 'Approved', approvedBy: actorId },
        },
      });

      return updated;
    });

    return record;
  }

  async rejectLeave(
    id: string,
    rejectionReason: string | null,
    context: AuthContext,
  ): Promise<LeaveRequestRecord> {
    ensurePermission(context, 'leave.approve');

    const leave = await this.repository.findById(id);
    if (!leave) {
      throw new DomainError('not_found', 'Leave request not found.');
    }

    ensureBranchScope(context, leave.branchId);

    if (leave.status !== 'Pending') {
      throw new DomainError(
        'invalid_value',
        `Cannot reject a leave request in status: ${leave.status}`,
      );
    }

    const actorId = context.actorId || null;

    const record = await this.prisma.$transaction(async (tx) => {
      const repo = new PrismaLeaveRepository(tx as any);
      const updated = await repo.updateStatus(id, 'Rejected', actorId, rejectionReason);

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'Faculty',
          performedBy: actorId,
          performedAt: new Date(),
          entityType: 'LeaveRequest',
          entityId: id,
          action: 'Reject',
          oldValue: { status: 'Pending' },
          newValue: { status: 'Rejected', approvedBy: actorId, rejectionReason },
        },
      });

      return updated;
    });

    return record;
  }

  async listLeaveRequests(
    filters: {
      personId?: string;
      branchId?: string;
      status?: string;
      date?: Date;
    },
    query: { page: number; pageSize: number },
    context: AuthContext,
  ): Promise<{ items: LeaveRequestRecord[]; total: number }> {
    ensurePermission(context, 'leave.read');
    if (filters.branchId) {
      ensureBranchScope(context, filters.branchId);
    }
    return this.repository.list(filters, query);
  }

  async cancelLeave(id: string, context: AuthContext): Promise<void> {
    ensurePermission(context, 'leave.apply');

    const leave = await this.repository.findById(id);
    if (!leave) {
      throw new DomainError('not_found', 'Leave request not found.');
    }

    ensureBranchScope(context, leave.branchId);

    const actorId = context.actorId || '';

    await this.prisma.$transaction(async (tx) => {
      const repo = new PrismaLeaveRepository(tx as any);
      await repo.delete(id, actorId);

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'Faculty',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'LeaveRequest',
          entityId: id,
          action: 'Delete',
          oldValue: { status: leave.status, isDeleted: false },
          newValue: { isDeleted: true },
        },
      });
    });
  }
}
