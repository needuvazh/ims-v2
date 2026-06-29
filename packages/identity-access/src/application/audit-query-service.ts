import type { Uuid } from '@ims/shared-kernel';
import type { IAuditLogRepository, AuditLogDto } from '../domain/repositories';
import { createIamError } from '../errors/iam-errors';

export interface AuditQueryCommandContext {
  actorId: Uuid;
  actorPermissions: string[];
  activeBranchId: Uuid | null;
}

export class AuditQueryService {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  private checkPermission(context: AuditQueryCommandContext, permission: string): void {
    if (!context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async listAuditLogs(
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
    pageSize: number,
    context: AuditQueryCommandContext
  ): Promise<{ items: AuditLogDto[]; total: number }> {
    this.checkPermission(context, 'iam.audit.read');

    // Enforce branch scope
    if (context.activeBranchId) {
      filters.branchId = context.activeBranchId;
    }

    return this.auditLogRepository.list(filters, page, pageSize);
  }

  async getAuditLogById(id: Uuid, context: AuditQueryCommandContext): Promise<AuditLogDto> {
    this.checkPermission(context, 'iam.audit.read');
    const log = await this.auditLogRepository.findById(id);
    if (!log) throw createIamError('IAM-SYS-001');

    // Enforce branch scope if set
    if (context.activeBranchId && log.branchId && log.branchId !== context.activeBranchId) {
      throw createIamError('IAM-AUTHZ-002');
    }

    return log;
  }
}
