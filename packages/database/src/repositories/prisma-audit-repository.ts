import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { AuditLogRepository, AuditLogEntry } from '@ims/audit';

export class PrismaAuditRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        actorId: entry.actorId ?? null,
        branchId: entry.branchId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        occurredAt: entry.occurredAt,
        details: (entry.details ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
