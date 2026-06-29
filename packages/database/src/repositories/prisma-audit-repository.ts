import type { PrismaClient } from '@prisma/client';
import type { AuditLogRepository, AuditLogEntry } from '@ims/audit';

export class PrismaAuditRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        performedBy: entry.actorId ?? null,
        performedAt: entry.occurredAt,
        branchId: entry.branchId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: undefined,
        newValue: (entry.details as any) ?? undefined,
        ipAddress: null,
        userAgent: null,
        correlationId: null,
        reason: null,
        module: null,
      },
    });
  }
}
