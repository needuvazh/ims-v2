import crypto from 'crypto';
import { InMemoryMetrics } from '@ims/observability';
import type { Uuid } from '@ims/shared-kernel';
import type {
  IUserBranchAccessRepository,
  IUserRepository,
  IAuditLogRepository,
  ISessionRepository,
} from '../domain/repositories';
import type { UserBranchAccess } from '../domain/user-branch-access';
import { createIamError } from '../errors/iam-errors';

export interface BranchAccessCommandContext {
  actorId: Uuid;
  actorPermissions: string[];
  activeBranchId: Uuid | null;
}

export class BranchAccessService {
  constructor(
    private readonly userBranchAccessRepository: IUserBranchAccessRepository,
    private readonly userRepository: IUserRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  private checkPermission(context: BranchAccessCommandContext, permission: string): void {
    if (!context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async assignBranchToUser(
    userId: Uuid,
    branchId: Uuid,
    isDefault: boolean = false,
    reason: string | null = null,
    context: BranchAccessCommandContext
  ): Promise<UserBranchAccess> {
    this.checkPermission(context, 'iam.user.assign-branch');

    const now = new Date();
    const existing = await this.userBranchAccessRepository.findByUser(userId);
    const activeAssignments = existing.filter((b) => b.status === 'Active');

    // If it's already assigned and active, throw error or return existing
    const alreadyAssigned = activeAssignments.find((b) => b.branchId === branchId);
    if (alreadyAssigned) {
      return alreadyAssigned;
    }

    const isFirstAssignment = activeAssignments.length === 0;

    const access: UserBranchAccess = {
      id: crypto.randomUUID() as Uuid,
      userId,
      branchId,
      isDefault: isDefault || isFirstAssignment,
      includeChildBranches: false,
      consolidatedVisibility: false,
      status: 'Active',
      revokedAt: null,
      revokedBy: null,
      reason: null,
      createdAt: now,
      createdBy: context.actorId,
      updatedAt: null,
      updatedBy: null,
    };

    const saved = await this.userBranchAccessRepository.assign(access);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId,
      performedAt: now,
      entityType: 'UserBranchAccess',
      entityId: saved.id,
      action: 'iam.user.branch-assigned',
      oldValue: null,
      newValue: { userId, branchId, isDefault: saved.isDefault },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId,
      correlationId: null,
      reason,
    });

    return saved;
  }

  async removeBranchFromUser(
    userId: Uuid,
    branchId: Uuid,
    reason: string | null = null,
    context: BranchAccessCommandContext
  ): Promise<void> {
    this.checkPermission(context, 'iam.user.assign-branch');

    const existing = await this.userBranchAccessRepository.findByUser(userId);
    const activeAssignments = existing.filter((b) => b.status === 'Active');

    if (activeAssignments.length <= 1) {
      throw createIamError('IAM-SYS-001', { message: 'User must retain at least one branch assignment.' });
    }

    const targetAccess = activeAssignments.find((b) => b.branchId === branchId);
    if (!targetAccess) {
      throw createIamError('IAM-SYS-001', { message: 'Branch assignment not found or already inactive.' });
    }

    const now = new Date();
    targetAccess.status = 'Revoked';
    targetAccess.revokedAt = now;
    targetAccess.revokedBy = context.actorId.toString();
    targetAccess.reason = reason;
    targetAccess.updatedAt = now;
    targetAccess.updatedBy = context.actorId;

    // If we revoked the default branch, assign default to another active branch
    if (targetAccess.isDefault) {
      targetAccess.isDefault = false;
      const nextDefault = activeAssignments.find((b) => b.branchId !== branchId);
      if (nextDefault) {
        nextDefault.isDefault = true;
        nextDefault.updatedAt = now;
        nextDefault.updatedBy = context.actorId;
        await this.userBranchAccessRepository.update(nextDefault);
      }
    }

    await this.userBranchAccessRepository.update(targetAccess);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId,
      performedAt: now,
      entityType: 'UserBranchAccess',
      entityId: targetAccess.id,
      action: 'iam.user.branch-removed',
      oldValue: { userId, branchId, status: 'Active' },
      newValue: { userId, branchId, status: 'Revoked', reason },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId,
      correlationId: null,
      reason,
    });
  }

  async setDefaultBranch(
    userId: Uuid,
    branchId: Uuid,
    context: BranchAccessCommandContext
  ): Promise<void> {
    this.checkPermission(context, 'iam.user.assign-branch');

    const existing = await this.userBranchAccessRepository.findByUser(userId);
    const activeAssignments = existing.filter((b) => b.status === 'Active');

    const targetAccess = activeAssignments.find((b) => b.branchId === branchId);
    if (!targetAccess) {
      throw createIamError('IAM-SYS-001', { message: 'Target branch is not actively assigned to the user.' });
    }

    const now = new Date();
    targetAccess.isDefault = true;
    targetAccess.updatedAt = now;
    targetAccess.updatedBy = context.actorId;

    await this.userBranchAccessRepository.update(targetAccess);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId,
      performedAt: now,
      entityType: 'UserBranchAccess',
      entityId: targetAccess.id,
      action: 'iam.user.default-branch-changed',
      oldValue: { defaultBranchId: activeAssignments.find((b) => b.isDefault)?.branchId },
      newValue: { defaultBranchId: branchId },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId,
      correlationId: null,
      reason: null,
    });
  }

  async switchActiveBranch(
    sessionJti: string,
    targetBranchId: Uuid,
    userId: Uuid
  ): Promise<void> {
    const existing = await this.userBranchAccessRepository.findByUser(userId);
    const hasAccess = existing.some((b) => b.branchId === targetBranchId && b.status === 'Active');

    if (!hasAccess) {
      throw createIamError('IAM-AUTHZ-002');
    }

    const session = await this.sessionRepository.findById(sessionJti as Uuid);
    if (!session) throw createIamError('IAM-AUTH-005');

    session.activeBranchId = targetBranchId;
    session.lastActivityAt = new Date();
    await this.sessionRepository.update(session);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: userId,
      performedAt: new Date(),
      entityType: 'UserSession',
      entityId: session.id,
      action: 'iam.session.branch-switched',
      oldValue: null,
      newValue: { activeBranchId: targetBranchId },
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      branchId: targetBranchId, // New branch sourced from session/switch event
      correlationId: null,
      reason: null,
    });

    InMemoryMetrics.getInstance().increment('iam.branch.switch', 1, { userId, targetBranchId });
  }

  async getUserBranchAccess(userId: Uuid, context: BranchAccessCommandContext): Promise<UserBranchAccess[]> {
    this.checkPermission(context, 'iam.user.read');
    return this.userBranchAccessRepository.findByUser(userId);
  }
}
