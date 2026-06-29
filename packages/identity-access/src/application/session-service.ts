import crypto from 'crypto';
import type { Uuid } from '@ims/shared-kernel';
import type { ISessionRepository, IAuditLogRepository, UserSessionDto } from '../domain/repositories';
import { createIamError } from '../errors/iam-errors';

export interface SessionCommandContext {
  actorId: Uuid;
  actorPermissions: string[];
  activeBranchId: Uuid | null;
}

export class SessionService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  private checkPermission(context: SessionCommandContext, permission: string): void {
    if (!context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async listUserSessions(userId: Uuid, context: SessionCommandContext): Promise<UserSessionDto[]> {
    this.checkPermission(context, 'iam.session.read');
    return this.sessionRepository.listActiveForUser(userId);
  }

  async terminateSession(sessionId: Uuid, context: SessionCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.session.terminate');
    const session = await this.sessionRepository.findById(sessionId);
    if (session) {
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
