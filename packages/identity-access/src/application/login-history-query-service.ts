import type { Uuid } from '@ims/shared-kernel';
import type { ILoginHistoryRepository, IUserBranchAccessRepository, LoginHistoryDto } from '../domain/repositories';
import { createIamError } from '../errors/iam-errors';

export interface LoginHistoryQueryContext {
  actorId: Uuid;
  actorPermissions: string[];
  activeBranchId: Uuid | null;
}

export class LoginHistoryQueryService {
  constructor(
    private readonly loginHistoryRepository: ILoginHistoryRepository,
    private readonly userBranchAccessRepository: IUserBranchAccessRepository
  ) {}

  private checkPermission(context: LoginHistoryQueryContext, permission: string): void {
    if (!context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  private async getActorAllowedBranchIds(actorId: string): Promise<string[] | 'All'> {
    const assignments = await this.userBranchAccessRepository.findByUser(actorId as Uuid);
    const activeAssignments = assignments.filter((a) => a.status === 'Active');
    
    if (activeAssignments.length === 0) {
      return 'All';
    }

    const allowed = new Set<string>();
    for (const a of activeAssignments) {
      allowed.add(a.branchId);
      if (a.includeChildBranches) {
        const children = await this.userBranchAccessRepository.resolveChildBranchIds(a.branchId);
        for (const cid of children) {
          allowed.add(cid);
        }
      }
    }
    return Array.from(allowed);
  }

  private async assertTargetUserInBranchScope(targetUserId: string, context?: LoginHistoryQueryContext): Promise<void> {
    if (!context) return;
    
    const actorAllowed = await this.getActorAllowedBranchIds(context.actorId);
    if (actorAllowed === 'All') {
      return;
    }

    const targetBranches = await this.userBranchAccessRepository.findByUser(targetUserId as Uuid);
    const activeTargetBranches = targetBranches.filter((b) => b.status === 'Active');

    if (activeTargetBranches.length === 0) {
      throw createIamError('IAM-AUTHZ-002');
    }

    const hasOverlap = activeTargetBranches.some((tb) => actorAllowed.includes(tb.branchId));
    if (!hasOverlap) {
      throw createIamError('IAM-AUTHZ-002');
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
    await this.assertTargetUserInBranchScope(userId, context);

    return this.loginHistoryRepository.findByUser(userId, page, pageSize);
  }
}
