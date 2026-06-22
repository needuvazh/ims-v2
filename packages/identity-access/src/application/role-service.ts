import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import {
  createRoleCommandSchema,
  updateRoleCommandSchema,
  type RoleRecord,
  type PermissionRecord,
  type CreateRoleCommand,
  type UpdateRoleCommand,
} from '../domain/role';
import type { AuditLogRepository } from '@ims/audit';

export interface RoleRepository {
  findById(roleId: string): Promise<RoleRecord | null>;
  findByCode(roleCode: string): Promise<RoleRecord | null>;
  create(role: RoleRecord): Promise<RoleRecord>;
  update(
    roleId: string,
    updates: Partial<Pick<RoleRecord, 'roleName' | 'description' | 'status' | 'effectiveStartDate' | 'effectiveEndDate'>>,
  ): Promise<RoleRecord>;
  list(): Promise<RoleRecord[]>;
  assignPermission(roleId: string, permissionId: string, actorId: string): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
  listPermissions(): Promise<PermissionRecord[]>;
  seedPermissions(permissions: Omit<PermissionRecord, 'id'>[]): Promise<void>;
}

export type RoleCommandContext = { actorId: Uuid };

/**
 * RoleService — manages roles and permission assignments.
 */
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly auditRepository: AuditLogRepository,
  ) {}

  async listRoles(): Promise<RoleRecord[]> {
    return this.roleRepository.list();
  }

  async listPermissions(): Promise<PermissionRecord[]> {
    return this.roleRepository.listPermissions();
  }

  async getRole(roleId: string): Promise<RoleRecord> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new DomainError('not_found', `Role ${roleId} not found.`);
    return role;
  }

  async createRole(command: CreateRoleCommand, context: RoleCommandContext): Promise<RoleRecord> {
    const validated = createRoleCommandSchema.parse(command);

    const existing = await this.roleRepository.findByCode(validated.roleCode);
    if (existing) throw new DomainError('conflict', `Role code ${validated.roleCode} already exists.`);

    const allPermissions = await this.roleRepository.listPermissions();
    for (const permId of validated.permissionIds) {
      const permission = allPermissions.find(p => p.id === permId);
      if (!permission) throw new DomainError('not_found', `Permission ${permId} not found.`);
      if (permission.status !== 'Active') {
        throw new DomainError('precondition_failed', `Cannot assign permission: Permission ${permission.permissionCode} is not active.`);
      }
    }

    const role: RoleRecord = {
      id: crypto.randomUUID() as Uuid,
      roleCode: validated.roleCode,
      roleName: validated.roleName,
      description: validated.description ?? null,
      status: 'Active',
      effectiveStartDate: validated.effectiveStartDate,
      effectiveEndDate: validated.effectiveEndDate,
      permissions: [],
    };

    const saved = await this.roleRepository.create(role);

    for (const permId of validated.permissionIds) {
      await this.roleRepository.assignPermission(saved.id, permId, context.actorId);
    }

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.role_created',
      entityType: 'Role',
      entityId: saved.id,
      occurredAt: new Date(),
      details: { roleCode: saved.roleCode },
    });

    return saved;
  }

  async updateRole(roleId: string, command: UpdateRoleCommand, context: RoleCommandContext): Promise<RoleRecord> {
    const validated = updateRoleCommandSchema.parse(command);
    const existing = await this.roleRepository.findById(roleId);
    if (!existing) throw new DomainError('not_found', `Role ${roleId} not found.`);

    const updated = await this.roleRepository.update(roleId, validated);

    let auditAction = 'identity.role_updated';
    if (validated.status === 'Inactive' && existing.status !== 'Inactive') {
      auditAction = 'identity.role_deactivated';
    }

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: auditAction,
      entityType: 'Role',
      entityId: roleId,
      occurredAt: new Date(),
      details: validated,
    });

    return updated;
  }

  async assignPermission(roleId: string, permissionId: string, context: RoleCommandContext): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new DomainError('not_found', `Role ${roleId} not found.`);

    const allPermissions = await this.roleRepository.listPermissions();
    const permission = allPermissions.find(p => p.id === permissionId);
    if (!permission) throw new DomainError('not_found', `Permission ${permissionId} not found.`);

    if (permission.status !== 'Active') {
      throw new DomainError('precondition_failed', `Cannot assign permission: Permission ${permission.permissionCode} is not active.`);
    }

    await this.roleRepository.assignPermission(roleId, permissionId, context.actorId);

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.permission_assigned',
      entityType: 'Role',
      entityId: roleId,
      occurredAt: new Date(),
      details: { permissionId },
    });
  }

  async removePermission(roleId: string, permissionId: string, context: RoleCommandContext): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new DomainError('not_found', `Role ${roleId} not found.`);

    await this.roleRepository.removePermission(roleId, permissionId);

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.permission_removed',
      entityType: 'Role',
      entityId: roleId,
      occurredAt: new Date(),
      details: { permissionId },
    });
  }
}
