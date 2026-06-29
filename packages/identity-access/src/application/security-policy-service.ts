import crypto from 'crypto';
import type { Uuid } from '@ims/shared-kernel';
import { updateSecurityPolicyCommandSchema, type SecurityPolicy, type UpdateSecurityPolicyCommand } from '../domain/security-policy';
import type { ISecurityPolicyRepository, IAuditLogRepository } from '../domain/repositories';
import { createIamError } from '../errors/iam-errors';

export interface SecurityPolicyCommandContext {
  actorId: Uuid;
  actorPermissions: string[];
  activeBranchId: Uuid | null;
}

export class SecurityPolicyService {
  constructor(
    private readonly securityPolicyRepository: ISecurityPolicyRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  private checkPermission(context: SecurityPolicyCommandContext, permission: string): void {
    if (!context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async getSecurityPolicy(context: SecurityPolicyCommandContext): Promise<SecurityPolicy> {
    this.checkPermission(context, 'iam.security-policy.read');
    return this.securityPolicyRepository.get();
  }

  async updateSecurityPolicy(
    command: UpdateSecurityPolicyCommand,
    context: SecurityPolicyCommandContext
  ): Promise<SecurityPolicy> {
    this.checkPermission(context, 'iam.security-policy.update');
    const validated = updateSecurityPolicyCommandSchema.parse(command);
    const now = new Date();

    const policy = await this.securityPolicyRepository.get();
    const oldPolicy = { ...policy };

    Object.assign(policy, validated);
    policy.updatedAt = now;

    const updated = await this.securityPolicyRepository.update(policy);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId,
      performedAt: now,
      entityType: 'SecurityPolicy',
      entityId: policy.id,
      action: 'iam.security-policy.updated',
      oldValue: oldPolicy,
      newValue: updated,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId,
      correlationId: null,
      reason: null,
    });

    return updated;
  }
}
