import crypto from 'crypto';
import type { Uuid } from '@ims/shared-kernel';
import {
  createPermissionCommandSchema,
  updatePermissionCommandSchema,
  type Permission,
  type CreatePermissionCommand,
  type UpdatePermissionCommand,
} from '../domain/permission';
import { createIamError } from '../errors/iam-errors';
import type { IPermissionRepository, IAuditLogRepository } from '../domain/repositories';

export interface PermissionCommandContext {
  actorId: Uuid;
  actorPermissions?: string[];
  activeBranchId?: Uuid | null;
}

export class PermissionService {
  constructor(
    private readonly permissionRepository: IPermissionRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  private checkPermission(context: PermissionCommandContext, permission: string): void {
    if (!context.actorPermissions || !context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async searchPermissions(
    type?: string,
    status?: string,
    context?: any
  ): Promise<Permission[]> {
    if (context) {
      this.checkPermission(context, 'iam.permission.read');
    }
    return this.permissionRepository.search(type, status);
  }

  async getPermissionById(id: Uuid, context: PermissionCommandContext): Promise<Permission> {
    this.checkPermission(context, 'iam.permission.read');
    const permission = await this.permissionRepository.findById(id);
    if (!permission) throw createIamError('IAM-SYS-001');
    return permission;
  }

  async createPermission(command: CreatePermissionCommand, context: PermissionCommandContext): Promise<Permission> {
    this.checkPermission(context, 'iam.permission.create');
    const validated = createPermissionCommandSchema.parse(command);
    const now = new Date();

    const existing = await this.permissionRepository.findByCode(validated.permissionCode);
    if (existing) {
      throw createIamError('IAM-VAL-003'); // already exists (reuse error code)
    }

    const permission: Permission = {
      id: crypto.randomUUID() as Uuid,
      permissionCode: validated.permissionCode,
      permissionName: validated.permissionName,
      permissionType: validated.permissionType,
      description: validated.description || null,
      status: 'Active',
      createdAt: now,
      createdBy: context.actorId,
      updatedAt: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
    };

    const saved = await this.permissionRepository.create(permission);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId,
      performedAt: now,
      entityType: 'Permission',
      entityId: saved.id,
      action: 'iam.permission.created',
      oldValue: null,
      newValue: saved,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId ?? null,
      correlationId: null,
      reason: null,
    });

    return saved;
  }

  async updatePermission(
    id: Uuid,
    command: UpdatePermissionCommand,
    context: PermissionCommandContext
  ): Promise<Permission> {
    this.checkPermission(context, 'iam.permission.update');
    const validated = updatePermissionCommandSchema.parse(command);
    const now = new Date();

    const existing = await this.permissionRepository.findById(id);
    if (!existing) throw createIamError('IAM-SYS-001');

    const old = { ...existing };

    if (validated.permissionName !== undefined) existing.permissionName = validated.permissionName;
    if (validated.description !== undefined) existing.description = validated.description;

    existing.updatedAt = now;
    existing.updatedBy = context.actorId;

    const updated = await this.permissionRepository.update(existing);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId,
      performedAt: now,
      entityType: 'Permission',
      entityId: id,
      action: 'iam.permission.updated',
      oldValue: old,
      newValue: updated,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId ?? null,
      correlationId: null,
      reason: null,
    });

    return updated;
  }

  async archivePermission(id: Uuid, context: PermissionCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.permission.archive');
    const existing = await this.permissionRepository.findById(id);
    if (!existing) throw createIamError('IAM-SYS-001');

    if (existing.status !== 'Archived') {
      const oldStatus = existing.status;
      existing.status = 'Archived';
      await this.permissionRepository.update(existing);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: context.actorId,
        performedAt: new Date(),
        entityType: 'Permission',
        entityId: id,
        action: 'iam.permission.archived',
        oldValue: { status: oldStatus },
        newValue: { status: 'Archived' },
        ipAddress: null,
        userAgent: null,
        branchId: context.activeBranchId ?? null,
        correlationId: null,
        reason: null,
      });
    }
  }
}
