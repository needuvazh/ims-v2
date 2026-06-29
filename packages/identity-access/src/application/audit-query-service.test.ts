import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuditLogDto, IAuditLogRepository } from '../domain/repositories';
import { AuditQueryService } from './audit-query-service';

function createAuditLog(overrides: Partial<AuditLogDto> = {}): AuditLogDto {
  return {
    id: crypto.randomUUID() as never,
    module: 'iam',
    performedBy: crypto.randomUUID() as never,
    performedAt: new Date(),
    entityType: 'User',
    entityId: crypto.randomUUID(),
    action: 'iam.user.created',
    oldValue: null,
    newValue: null,
    ipAddress: null,
    userAgent: null,
    branchId: '11111111-1111-1111-1111-111111111111' as never,
    correlationId: null,
    reason: null,
    ...overrides,
  };
}

describe('AuditQueryService', () => {
  let service: AuditQueryService;
  let repo: IAuditLogRepository;

  const logs = new Map<string, AuditLogDto>();
  const scopedLog = createAuditLog({ id: 'audit-1' as never, branchId: '11111111-1111-1111-1111-111111111111' as never, entityId: 'user-1' });
  const otherBranchLog = createAuditLog({ id: 'audit-2' as never, branchId: '22222222-2222-2222-2222-222222222222' as never, entityId: 'user-2' });

  beforeEach(() => {
    logs.clear();
    logs.set(scopedLog.id, scopedLog);
    logs.set(otherBranchLog.id, otherBranchLog);

    repo = {
      append: async () => undefined,
      list: async (filters, page, pageSize) => {
        const items = Array.from(logs.values()).filter((entry) => {
          if (filters.branchId && entry.branchId !== filters.branchId) return false;
          if (filters.entityType && entry.entityType !== filters.entityType) return false;
          if (filters.entityId && entry.entityId !== filters.entityId) return false;
          if (filters.action && entry.action !== filters.action) return false;
          if (filters.performerId && entry.performedBy !== filters.performerId) return false;
          if (filters.module && entry.module !== filters.module) return false;
          if (filters.startDate && entry.performedAt < filters.startDate) return false;
          if (filters.endDate && entry.performedAt > filters.endDate) return false;
          return true;
        });
        return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length };
      },
      findById: async (id) => logs.get(String(id)) ?? null,
    };

    service = new AuditQueryService(repo);
  });

  it('lists audit logs with branch scoping and permission', async () => {
    const result = await service.listAuditLogs({}, 1, 20, { actorId: crypto.randomUUID() as never, actorPermissions: ['iam.audit.read'], activeBranchId: '11111111-1111-1111-1111-111111111111' as never });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(scopedLog.id);
  });

  it('returns an audit log by id within branch scope', async () => {
    const result = await service.getAuditLogById(scopedLog.id as never, { actorId: crypto.randomUUID() as never, actorPermissions: ['iam.audit.read'], activeBranchId: '11111111-1111-1111-1111-111111111111' as never });
    expect(result.id).toBe(scopedLog.id);
  });

  it('rejects audit log access outside branch scope', async () => {
    await expect(service.getAuditLogById(otherBranchLog.id as never, { actorId: crypto.randomUUID() as never, actorPermissions: ['iam.audit.read'], activeBranchId: '11111111-1111-1111-1111-111111111111' as never })).rejects.toMatchObject({ errorCode: 'IAM-AUTHZ-002' });
  });

  it('rejects missing permission', async () => {
    await expect(service.listAuditLogs({}, 1, 20, { actorId: crypto.randomUUID() as never, actorPermissions: [], activeBranchId: null })).rejects.toMatchObject({ errorCode: 'IAM-AUTHZ-001' });
  });
});
