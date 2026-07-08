import { PrismaClient } from '@prisma/client';
import { DomainError, type Uuid } from '@ims/shared-kernel';
import {
  type LeaveRequestRecord,
  type LeaveStatus,
  type LeaveType,
  LeaveTypeSchema,
} from '../domain/leave';

export class PrismaLeaveRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRow(row: any): LeaveRequestRecord {
    return {
      id: row.id as Uuid,
      personId: row.personId as Uuid,
      branchId: row.branchId as Uuid,
      startDate: row.startDate,
      endDate: row.endDate,
      startTime: row.startTime,
      endTime: row.endTime,
      isFullDay: row.isFullDay,
      leaveType: LeaveTypeSchema.parse(row.leaveType),
      reason: row.reason,
      status: row.status as LeaveStatus,
      approvedBy: row.approvedBy as Uuid | null,
      approvedAt: row.approvedAt,
      rejectionReason: row.rejectionReason,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      isDeleted: row.isDeleted,
      person: row.person
        ? {
            id: row.person.id as Uuid,
            firstName: row.person.firstName,
            lastName: row.person.lastName,
            email: row.person.email,
            mobile: row.person.mobile,
          }
        : undefined,
      branch: row.branch
        ? {
            id: row.branch.id as Uuid,
            branchCode: row.branch.branchCode,
            branchName: row.branch.branchName,
          }
        : undefined,
    };
  }

  async create(data: {
    id: string;
    personId: string;
    branchId: string;
    startDate: Date;
    endDate: Date;
    startTime?: string | null;
    endTime?: string | null;
    isFullDay: boolean;
    leaveType: LeaveType;
    reason?: string | null;
    createdBy?: string | null;
  }): Promise<LeaveRequestRecord> {
    const row = await this.prisma.leaveRequest.create({
      data: {
        id: data.id,
        personId: data.personId,
        branchId: data.branchId,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        isFullDay: data.isFullDay,
        leaveType: data.leaveType,
        reason: data.reason,
        status: 'Pending',
        createdBy: data.createdBy,
      },
      include: {
        person: true,
        branch: true,
      },
    });

    return this.mapRow(row);
  }

  async findById(id: string): Promise<LeaveRequestRecord | null> {
    const row = await this.prisma.leaveRequest.findFirst({
      where: { id, isDeleted: false },
      include: {
        person: true,
        branch: true,
      },
    });
    if (!row) return null;
    return this.mapRow(row);
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    approverId: string | null,
    rejectionReason: string | null = null,
  ): Promise<LeaveRequestRecord> {
    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: approverId,
        approvedAt: status === 'Approved' ? new Date() : null,
        rejectionReason: status === 'Rejected' ? rejectionReason : null,
      },
      include: {
        person: true,
        branch: true,
      },
    });

    return this.mapRow(row);
  }

  async list(
    filters: {
      personId?: string;
      branchId?: string;
      status?: string;
      date?: Date;
    },
    query: { page: number; pageSize: number },
  ): Promise<{ items: LeaveRequestRecord[]; total: number }> {
    const where: any = {
      isDeleted: false,
      ...(filters.personId ? { personId: filters.personId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.date
        ? {
            startDate: { lte: filters.date },
            endDate: { gte: filters.date },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { startDate: 'desc' },
        include: {
          person: true,
          branch: true,
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }
}
