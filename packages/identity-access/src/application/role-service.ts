import crypto from 'crypto';
import type { Uuid } from '@ims/shared-kernel';
import {
  createRoleCommandSchema,
  updateRoleCommandSchema,
  type Role,
  type CreateRoleCommand,
  type UpdateRoleCommand,
  assertRoleArchivable,
} from '../domain/role';
import { createIamError } from '../errors/iam-errors';
import type { IRoleRepository, IAuditLogRepository, IPermissionRepository, IUserRepository, INotificationRepository } from '../domain/repositories';

export interface RoleCommandContext {
  actorId: string;
  actorPermissions?: string[];
  activeBranchId?: string | null;
}

export class RoleService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly userRepository?: IUserRepository,
    private readonly notificationRepository?: INotificationRepository
  ) {}

  private checkPermission(context: RoleCommandContext, permission: string): void {
    if (context.actorPermissions && !context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async listRoles(
    pageOrContext?: number | RoleCommandContext,
    pageSize?: number,
    context?: RoleCommandContext
  ): Promise<any> {
    if (pageOrContext && typeof pageOrContext === 'object') {
      const ctx = pageOrContext;
      this.checkPermission(ctx, 'iam.role.read');
      const res = await this.roleRepository.search(1, 1000);
      const items = [];
      for (const r of res.items) {
        const perms = await this.roleRepository.listPermissionsForRole(r.id);
        items.push({
          ...r,
          permissions: perms,
        });
      }
      return items;
    } else if (typeof pageOrContext === 'number') {
      const page = pageOrContext;
      const limit = pageSize || 10;
      const ctx = context!;
      this.checkPermission(ctx, 'iam.role.read');
      const res = await this.roleRepository.search(page, limit);
      const items = [];
      for (const r of res.items) {
        const perms = await this.roleRepository.listPermissionsForRole(r.id);
        items.push({
          ...r,
          permissions: perms,
        });
      }
      return { items, total: res.total };
    } else {
      const res = await this.roleRepository.search(1, 1000);
      const items = [];
      for (const r of res.items) {
        const perms = await this.roleRepository.listPermissionsForRole(r.id);
        items.push({
          ...r,
          permissions: perms,
        });
      }
      return items;
    }
  }

  async createRole(command: CreateRoleCommand, context: RoleCommandContext): Promise<Role> {
    this.checkPermission(context, 'iam.role.create');
    const validated = createRoleCommandSchema.parse(command);
    const now = new Date();

    const existing = await this.roleRepository.findByCode(validated.roleCode);
    if (existing) {
      throw createIamError('IAM-VAL-003'); // role code already exists
    }

    const role: Role = {
      id: crypto.randomUUID() as Uuid,
      roleCode: validated.roleCode,
      roleName: validated.roleName,
      description: validated.description || null,
      status: (validated.status as any) || 'Active',
      isSystemRole: false,
      version: 1,
      effectiveStartDate: validated.effectiveStartDate || now,
      effectiveEndDate: validated.effectiveEndDate || null,
      createdAt: now,
      createdBy: context.actorId as Uuid,
      updatedAt: null,
      updatedBy: null,
    };

    const saved = await this.roleRepository.create(role);

    // Assign legacy permissions if passed
    if (validated.permissionIds) {
      for (const permId of validated.permissionIds) {
        await this.roleRepository.assignPermissionToRole(saved.id, permId as Uuid, context.actorId as Uuid);
      }
    }

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: now,
      entityType: 'Role',
      entityId: saved.id,
      action: 'iam.role.created',
      oldValue: null,
      newValue: { roleCode: saved.roleCode, roleName: saved.roleName },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });

    return saved;
  }

  async updateRole(roleId: string, command: UpdateRoleCommand, context: RoleCommandContext): Promise<Role> {
    this.checkPermission(context, 'iam.role.update');
    const validated = updateRoleCommandSchema.parse(command);
    const now = new Date();

    const existing = await this.roleRepository.findById(roleId as Uuid);
    if (!existing) throw createIamError('IAM-SYS-001');

    const oldRole = { ...existing };

    if (validated.roleName !== undefined) existing.roleName = validated.roleName;
    if (validated.description !== undefined) existing.description = validated.description;
    if (validated.effectiveStartDate !== undefined) existing.effectiveStartDate = validated.effectiveStartDate;
    if (validated.effectiveEndDate !== undefined) existing.effectiveEndDate = validated.effectiveEndDate;
    if (validated.status !== undefined && validated.status !== null) existing.status = validated.status as any;

    existing.updatedAt = now;
    existing.updatedBy = context.actorId as Uuid;

    const updated = await this.roleRepository.update(existing);

    // Sync legacy permissions if passed
    if (validated.permissionIds) {
      const existingPermissions = await this.roleRepository.listPermissionsForRole(existing.id);
      
      // Revoke old permissions not in new list
      for (const oldPerm of existingPermissions) {
        if (!validated.permissionIds.includes(oldPerm.id)) {
          await this.roleRepository.removePermissionFromRole(existing.id, oldPerm.id);
        }
      }

      // Add new permissions
      for (const newPermId of validated.permissionIds) {
        const match = existingPermissions.find((p) => p.id === newPermId);
        if (!match) {
          await this.roleRepository.assignPermissionToRole(existing.id, newPermId as Uuid, context.actorId as Uuid);
        }
      }
    }

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: now,
      entityType: 'Role',
      entityId: roleId as Uuid,
      action: 'iam.role.updated',
      oldValue: oldRole,
      newValue: updated,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });

    return updated;
  }

  async archiveRole(roleId: string, context: RoleCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.role.archive');
    const role = await this.roleRepository.findById(roleId as Uuid);
    if (!role) throw createIamError('IAM-SYS-001');

    try {
      assertRoleArchivable(role);
    } catch {
      throw createIamError('IAM-VAL-010');
    }

    if (role.status !== 'Archived') {
      const oldStatus = role.status;
      role.status = 'Archived';
      await this.roleRepository.update(role);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: context.actorId as Uuid,
        performedAt: new Date(),
        entityType: 'Role',
        entityId: roleId as Uuid,
        action: 'iam.role.archived',
        oldValue: { status: oldStatus },
        newValue: { status: 'Archived' },
        ipAddress: null,
        userAgent: null,
        branchId: context.activeBranchId as Uuid | null,
        correlationId: null,
        reason: null,
      });
    }
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    context: RoleCommandContext
  ): Promise<void> {
    this.checkPermission(context, 'iam.role.permission.assign');
    const role = await this.roleRepository.findById(roleId as Uuid);
    if (!role || role.status !== 'Active') {
      throw createIamError('IAM-SYS-001');
    }

    const permission = await this.permissionRepository.findById(permissionId as Uuid);
    if (!permission || permission.status !== 'Active') {
      throw createIamError('IAM-SYS-001');
    }

    await this.roleRepository.assignPermissionToRole(roleId as Uuid, permissionId as Uuid, context.actorId as Uuid);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: new Date(),
      entityType: 'RolePermission',
      entityId: `${roleId}_${permissionId}`,
      action: 'iam.role.permission-assigned',
      oldValue: null,
      newValue: { roleId, permissionId },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    context: RoleCommandContext
  ): Promise<void> {
    this.checkPermission(context, 'iam.role.permission.assign');
    const role = await this.roleRepository.findById(roleId as Uuid);
    if (!role) throw createIamError('IAM-SYS-001');

    await this.roleRepository.removePermissionFromRole(roleId as Uuid, permissionId as Uuid);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: new Date(),
      entityType: 'RolePermission',
      entityId: `${roleId}_${permissionId}`,
      action: 'iam.role.permission-removed',
      oldValue: { roleId, permissionId },
      newValue: null,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    reason: string | null = null,
    context: RoleCommandContext
  ): Promise<void> {
    this.checkPermission(context, 'iam.user.assign-role');
    const role = await this.roleRepository.findById(roleId as Uuid);
    if (!role || role.status !== 'Active') {
      throw createIamError('IAM-SYS-001');
    }

    await this.roleRepository.assignRoleToUser(userId as Uuid, roleId as Uuid, context.actorId as Uuid);

    if (this.userRepository && this.notificationRepository) {
      const recipient = await this.userRepository.findById(userId as Uuid);
      if (!recipient) {
        throw createIamError('IAM-SYS-001');
      }

      await this.notificationRepository.create({
        id: crypto.randomUUID() as Uuid,
        type: 'user.role_assigned',
        recipientUserId: recipient.id,
        recipientEmail: recipient.email,
        subject: `Role assigned: ${role.roleName}`,
        body: `A new role, ${role.roleName}, has been assigned to your account.`,
        status: 'Pending',
        metadata: { roleId: role.id, roleCode: role.roleCode },
        providerResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: new Date(),
      entityType: 'UserRole',
      entityId: `${userId}_${roleId}`,
      action: 'iam.user.role-assigned',
      oldValue: null,
      newValue: { userId, roleId, reason },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason,
    });
  }

  async removeRoleFromUser(
    userId: string,
    roleId: string,
    reason: string | null = null,
    context: RoleCommandContext
  ): Promise<void> {
    this.checkPermission(context, 'iam.user.assign-role');
    const role = await this.roleRepository.findById(roleId as Uuid);
    if (!role) throw createIamError('IAM-SYS-001');

    await this.roleRepository.revokeRoleFromUser(userId as Uuid, roleId as Uuid, context.actorId as Uuid, reason);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: new Date(),
      entityType: 'UserRole',
      entityId: `${userId}_${roleId}`,
      action: 'iam.user.role-revoked',
      oldValue: { userId, roleId, status: 'Active' },
      newValue: { userId, roleId, status: 'Revoked', reason },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason,
    });
  }

  async getRolePermissions(roleId: string, context: RoleCommandContext): Promise<any[]> {
    this.checkPermission(context, 'iam.role.read');
    return this.roleRepository.listPermissionsForRole(roleId as Uuid);
  }

  async listUsersForRole(roleId: string, context: RoleCommandContext): Promise<{ userId: string; username: string; status: string; fullName: string | null }[]> {
    this.checkPermission(context, 'iam.role.read');
    return this.roleRepository.listUsersForRole(roleId as Uuid);
  }

  async listRolesForUser(userId: string, context?: RoleCommandContext): Promise<any[]> {
    if (context) {
      this.checkPermission(context, 'iam.user.read');
    }
    return this.roleRepository.listRolesForUser(userId as Uuid);
  }

  async assignPermission(roleId: string, permissionId: string, context: RoleCommandContext): Promise<void> {
    return this.assignPermissionToRole(roleId, permissionId, context);
  }

  async removePermission(roleId: string, permissionId: string, context: RoleCommandContext): Promise<void> {
    return this.removePermissionFromRole(roleId, permissionId, context);
  }

  async listPermissions(): Promise<any[]> {
    return this.permissionRepository.search();
  }

}
