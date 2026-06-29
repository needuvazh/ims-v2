import type { Uuid } from '@ims/shared-kernel';
import type { ILoginHistoryRepository, LoginHistoryDto } from '../domain/repositories';
import { createIamError } from '../errors/iam-errors';

export interface LoginHistoryQueryContext {
  actorId: Uuid;
  actorPermissions: string[];
  activeBranchId: Uuid | null;
}

export class LoginHistoryQueryService {
  constructor(private readonly loginHistoryRepository: ILoginHistoryRepository) {}

  private checkPermission(context: LoginHistoryQueryContext, permission: string): void {
    if (!context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async listSecurityLoginHistory(
    filters: { branchId?: string; status?: string; startDate?: Date; endDate?: Date },
    page: number,
    pageSize: number,
    context: LoginHistoryQueryContext
  ): Promise<{ items: LoginHistoryDto[]; total: number }> {
    this.checkPermission(context, 'iam.audit.read');

    if (context.activeBranchId) {
      filters.branchId = context.activeBranchId;
    }

    return this.loginHistoryRepository.list(filters, page, pageSize);
  }

  async listUserLoginHistory(
    userId: Uuid,
    page: number,
    pageSize: number,
    context: LoginHistoryQueryContext
  ): Promise<{ items: LoginHistoryDto[]; total: number }> {
    this.checkPermission(context, 'iam.user.read');

    return this.loginHistoryRepository.findByUser(userId, page, pageSize);
  }
}
