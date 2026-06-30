import crypto from 'crypto';
import type { Uuid } from '@ims/shared-kernel';
import type { ISessionRepository, IAuditLogRepository, IUserBranchAccessRepository, UserSessionDto } from '../domain/repositories';
import { createIamError } from '../errors/iam-errors';

export interface SessionCommandContext {
  actorId: Uuid;
  actorPermissions: string[];
  activeBranchId: Uuid | null;
}

export class SessionService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly userBranchAccessRepository: IUserBranchAccessRepository
  ) {}

  private checkPermission(context: SessionCommandContext, permission: string): void {
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

  private async assertTargetUserInBranchScope(targetUserId: string, context?: SessionCommandContext): Promise<void> {
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

  async listUserSessions(userId: Uuid, context: SessionCommandContext): Promise<UserSessionDto[]> {
    this.checkPermission(context, 'iam.session.read');
    await this.assertTargetUserInBranchScope(userId, context);
    return this.sessionRepository.listActiveForUser(userId);
  }

  async terminateSession(sessionId: Uuid, context: SessionCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.session.terminate');
    const session = await this.sessionRepository.findById(sessionId);
    if (session) {
      await this.assertTargetUserInBranchScope(session.userId, context);
      await this.sessionRepository.revoke(sessionId);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: context.actorId,
        performedAt: new Date(),
        entityType: 'UserSession',
        entityId: sessionId,
        action: 'iam.session.terminated',
        oldValue: { status: 'Active' },
        newValue: { status: 'Revoked' },
        ipAddress: null,
        userAgent: null,
        branchId: context.activeBranchId,
        correlationId: null,
        reason: 'admin_terminated',
      });
    }
  }

  async terminateAllUserSessions(userId: Uuid, context: SessionCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.session.terminate');
    await this.assertTargetUserInBranchScope(userId, context);
    await this.sessionRepository.revokeAllForUser(userId);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId,
      performedAt: new Date(),
      entityType: 'User',
      entityId: userId,
      action: 'iam.session.all-terminated',
      oldValue: null,
      newValue: null,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId,
      correlationId: null,
      reason: 'admin_terminated_all',
    });
  }
}
