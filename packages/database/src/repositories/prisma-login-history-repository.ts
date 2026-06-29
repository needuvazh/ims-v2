import type { PrismaClient } from '@prisma/client';
import type { ILoginHistoryRepository, LoginHistoryDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaLoginHistoryRepository implements ILoginHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRecord(row: any): LoginHistoryDto {
    return {
      id: row.id as Uuid,
      userId: row.userId as Uuid | null,
      attemptedEmail: row.attemptedEmail,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      browser: row.browser,
      os: row.os,
      device: row.device,
      status: row.status as LoginHistoryDto['status'],
      failureReason: row.failureReason,
      branchId: row.branchId as Uuid | null,
      createdAt: row.createdAt,
    };
  }

  async append(record: LoginHistoryDto): Promise<void> {
    await this.prisma.loginHistory.create({
      data: {
        id: record.id,
        userId: record.userId,
        attemptedEmail: record.attemptedEmail,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
        browser: record.browser,
        os: record.os,
        device: record.device,
        status: record.status,
        failureReason: record.failureReason,
        branchId: record.branchId,
        createdAt: record.createdAt,
      },
    });
  }

  async findByUser(
    userId: Uuid,
    page: number,
    pageSize: number
  ): Promise<{ items: LoginHistoryDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where: { userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loginHistory.count({ where: { userId } }),
    ]);
    return {
      items: rows.map((r) => this.mapRecord(r)),
      total,
    };
  }

  async list(
    filters: { branchId?: string; status?: string; startDate?: Date; endDate?: Date },
    page: number,
    pageSize: number
  ): Promise<{ items: LoginHistoryDto[]; total: number }> {
    const where: any = {};
    if (filters.branchId) {
      where.branchId = filters.branchId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loginHistory.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapRecord(r)),
      total,
    };
  }
}
