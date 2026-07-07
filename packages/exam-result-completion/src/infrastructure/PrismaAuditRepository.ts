import { PrismaClient, Prisma } from '@prisma/client';
import { AuditMetadata } from '@ims/shared-kernel';

export class PrismaAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(entry: AuditMetadata, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        performedBy: entry.actorId || null,
        performedAt: entry.occurredAt,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        newValue: JSON.parse(JSON.stringify(entry.details || {})),
        branchId: entry.branchId || null,
        module: 'exam-result-completion',
      },
    });
  }
}

export async function recordAudit(
  prisma: PrismaClient,
  audit: AuditMetadata,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const repo = new PrismaAuditRepository(prisma);
  await repo.append(audit, tx);
}
