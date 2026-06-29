import type { PrismaClient } from '@prisma/client';
import type { IAuditLogRepository, AuditLogDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapLog(row: any): AuditLogDto {
    return {
      id: row.id as Uuid,
      module: row.module || 'Default',
      performedBy: row.performedBy as Uuid | null,
      performedAt: row.performedAt,
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action,
      oldValue: row.oldValue,
      newValue: row.newValue,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      branchId: row.branchId as Uuid | null,
      correlationId: row.correlationId,
      reason: row.reason,
    };
  }

  async append(log: AuditLogDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: log.id,
        module: log.module,
        performedBy: log.performedBy,
        performedAt: log.performedAt,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        oldValue: log.oldValue || undefined,
        newValue: log.newValue || undefined,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        branchId: log.branchId,
        correlationId: log.correlationId,
        reason: log.reason,
      },
    });
  }

  async list(
    filters: {
      entityType?: string;
      entityId?: string;
      action?: string;
      performerId?: string;
      startDate?: Date;
      endDate?: Date;
      branchId?: string;
      module?: string;
    },
    page: number,
    pageSize: number
  ): Promise<{ items: AuditLogDto[]; total: number }> {
    const where: any = {};
    if (filters.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.performerId) {
      where.performedBy = filters.performerId;
    }
    if (filters.startDate || filters.endDate) {
      where.performedAt = {};
      if (filters.startDate) {
        where.performedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.performedAt.lte = filters.endDate;
      }
    }
    if (filters.branchId) {
      where.branchId = filters.branchId;
    }
    if (filters.module) {
      where.module = filters.module;
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapLog(r)),
      total,
    };
  }

  async findById(id: Uuid): Promise<AuditLogDto | null> {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
    });
    return row ? this.mapLog(row) : null;
  }
}
