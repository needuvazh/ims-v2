import { beforeEach, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import { InMemoryAuditLogRepository } from '@ims/audit';
import { RoleService } from './role-service';
import type { IRoleRepository, IPermissionRepository, IAuditLogRepository, IUserRepository, INotificationRepository } from '../domain/repositories';
import type { Role } from '../domain/role';
import type { Permission } from '../domain/permission';
import type { User } from '../domain/user';

function createRole(overrides: Partial<Role> = {}): Role {
  return {
    id: crypto.randomUUID(),
    roleCode: 'ROLE_ACTIVE',
    roleName: 'Role Active',
    description: null,
    status: 'Active',
    isSystemRole: false,
    version: 1,
    effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
    effectiveEndDate: null,
    createdAt: new Date(),
    createdBy: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function createPermission(overrides: Partial<Permission> = {}): Permission {
  return {
    id: crypto.randomUUID(),
    permissionCode: 'iam.user.read',
    permissionName: 'Read users',
    permissionType: 'Action',
    description: null,
    status: 'Active',
    createdAt: new Date(),
    createdBy: null,
    updatedAt: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
    ...overrides,
  };
}

describe('RoleService', () => {
  let roleService: RoleService;
  let roleRepo: IRoleRepository;
  let permissionRepo: IPermissionRepository;
  let auditRepo: IAuditLogRepository;
  let userRepo: IUserRepository;
  let notificationRepo: INotificationRepository;

  const roleStore = new Map<string, Role>();
  const permissionStore = new Map<string, Permission>();
  const rolePermissions = new Map<string, Permission[]>();
  const userRoles = new Map<string, Array<{ role: Role; status: string; revokedAt: Date | null; revokedBy: string | null; reason: string | null }>>();
  const notifications: Array<{ type: string; recipientEmail: string; subject: string }> = [];
  const userStore = new Map<string, User>();

  beforeEach(() => {
    roleStore.clear();
    permissionStore.clear();
    rolePermissions.clear();
    userRoles.clear();
    notifications.length = 0;
    userStore.clear();

    const activeRole = createRole();
    const systemRole = createRole({ id: 'role-system', roleCode: 'ROLE_SYSTEM', roleName: 'System Role', isSystemRole: true });
    const activePermission = createPermission({ permissionCode: 'iam.user.read', permissionName: 'Read users' });
    const inactivePermission = createPermission({ id: 'perm-inactive', permissionCode: 'iam.user.update', permissionName: 'Update users', status: 'Archived' });

    roleStore.set(activeRole.id, activeRole);
    roleStore.set(systemRole.id, systemRole);
    permissionStore.set(activePermission.id, activePermission);
    permissionStore.set(inactivePermission.id, inactivePermission);
    rolePermissions.set(activeRole.id, [activePermission]);
    userRoles.set('user-1', [{ role: activeRole, status: 'Active', revokedAt: null, revokedBy: null, reason: null }]);

    userStore.set('actor-1', {
      id: 'actor-1' as never,
      personId: crypto.randomUUID() as never,
      username: 'actor@example.com',
      email: 'actor@example.com',
      userType: 'Admin',
      status: 'Active',
      defaultBranchId: null,
      preferredLanguage: 'en',
      failedLoginCount: 0,
      lockedUntil: null,
      passwordChangedAt: null,
      version: 1,
      effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
      effectiveEndDate: null,
      isDeleted: false,
    });
    userStore.set('user-1', {
      id: 'user-1' as never,
      personId: crypto.randomUUID() as never,
      username: 'user@example.com',
      email: 'user@example.com',
      userType: 'Admin',
      status: 'Active',
      defaultBranchId: null,
      preferredLanguage: 'en',
      failedLoginCount: 0,
      lockedUntil: null,
      passwordChangedAt: null,
      version: 1,
      effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
      effectiveEndDate: null,
      isDeleted: false,
    });

    roleRepo = {
      findById: async (id) => roleStore.get(id) ?? null,
      findByCode: async (code) => Array.from(roleStore.values()).find((role) => role.roleCode === code) ?? null,
      create: async (role) => {
        roleStore.set(role.id, role);
        return role;
      },
      update: async (role) => {
        roleStore.set(role.id, role);
        return role;
      },
      search: async (page, pageSize) => ({ items: Array.from(roleStore.values()).slice(0, pageSize), total: roleStore.size }),
      assignRoleToUser: async (userId, roleId) => {
        const role = roleStore.get(roleId);
        if (!role) return;
        const list = userRoles.get(userId) ?? [];
        list.push({ role, status: 'Active', revokedAt: null, revokedBy: null, reason: null });
        userRoles.set(userId, list);
      },
      revokeRoleFromUser: async (userId, roleId, actorId, reason) => {
        const list = userRoles.get(userId) ?? [];
        const target = list.find((entry) => entry.role.id === roleId);
        if (target) {
          target.status = 'Revoked';
          target.revokedAt = new Date();
          target.revokedBy = actorId.toString();
          target.reason = reason;
        }
      },
      listRolesForUser: async (userId) => userRoles.get(userId) ?? [],
      assignPermissionToRole: async (roleId, permissionId) => {
        const permission = permissionStore.get(permissionId);
        if (!permission) return;
        const list = rolePermissions.get(roleId) ?? [];
        list.push(permission);
        rolePermissions.set(roleId, list);
      },
      removePermissionFromRole: async (roleId, permissionId) => {
        const list = rolePermissions.get(roleId) ?? [];
        rolePermissions.set(roleId, list.filter((permission) => permission.id !== permissionId));
      },
      listPermissionsForRole: async (roleId) => rolePermissions.get(roleId) ?? [],
    };

    permissionRepo = {
      findById: async (id) => permissionStore.get(id) ?? null,
      findByCode: async (code) => Array.from(permissionStore.values()).find((permission) => permission.permissionCode === code) ?? null,
      create: async (permission) => {
        permissionStore.set(permission.id, permission);
        return permission;
      },
      update: async (permission) => {
        permissionStore.set(permission.id, permission);
        return permission;
      },
      search: async () => Array.from(permissionStore.values()),
    };

    userRepo = {
      findById: async (id) => userStore.get(String(id)) ?? null,
      findByEmail: async () => null,
      findByUsername: async () => null,
      findPersonById: async () => null,
      findPersonByMobile: async () => null,
      create: async (user) => user,
      update: async (user) => user,
      search: async () => ({ items: [], total: 0 }),
      getPasswordHash: async () => null,
      updatePassword: async () => undefined,
      createResetToken: async () => undefined,
      findResetTokenByHash: async () => null,
      markResetTokenAsUsed: async () => undefined,
    };

    notificationRepo = {
      create: async (notification) => {
        notifications.push({ type: notification.type, recipientEmail: notification.recipientEmail, subject: notification.subject });
        return notification;
      },
      update: async (notification) => notification,
      findById: async () => null,
      listPending: async () => [],
    };

    auditRepo = new InMemoryAuditLogRepository();
    roleService = new RoleService(roleRepo, permissionRepo, auditRepo, userRepo, notificationRepo);
  });

  it('creates, updates, and archives roles', async () => {
    const created = await roleService.createRole({ roleCode: 'ROLE_NEW', roleName: 'New Role', description: null }, { actorId: 'actor-1' as never, actorPermissions: ['iam.role.create'], activeBranchId: null });
    expect(created.roleCode).toBe('ROLE_NEW');

    const updated = await roleService.updateRole(created.id, { roleName: 'Updated Role' }, { actorId: 'actor-1' as never, actorPermissions: ['iam.role.update'], activeBranchId: null });
    expect(updated.roleName).toBe('Updated Role');

    await expect(roleService.archiveRole('role-system', { actorId: 'actor-1' as never, actorPermissions: ['iam.role.archive'], activeBranchId: null })).rejects.toMatchObject({ errorCode: 'IAM-VAL-010' });
    await roleService.archiveRole(created.id, { actorId: 'actor-1' as never, actorPermissions: ['iam.role.archive'], activeBranchId: null });
    expect(roleStore.get(created.id)?.status).toBe('Archived');
  });

  it('assigns and removes permissions on roles', async () => {
    const roleId = Array.from(roleStore.values())[0].id;
    const permissionId = Array.from(permissionStore.values())[0].id;

    await roleService.assignPermissionToRole(roleId, permissionId, { actorId: 'actor-1' as never, actorPermissions: ['iam.role.permission.assign'], activeBranchId: null });
    expect((rolePermissions.get(roleId) ?? []).some((permission) => permission.id === permissionId)).toBe(true);

    await roleService.removePermissionFromRole(roleId, permissionId, { actorId: 'actor-1' as never, actorPermissions: ['iam.role.permission.assign'], activeBranchId: null });
    expect((rolePermissions.get(roleId) ?? []).some((permission) => permission.id === permissionId)).toBe(false);
  });

  it('assigns a role to a user and creates a notification', async () => {
    const roleId = Array.from(roleStore.values())[0].id;

    await roleService.assignRoleToUser('user-1', roleId, 'reason', { actorId: 'actor-1' as never, actorPermissions: ['iam.user.assign-role'], activeBranchId: null });

    expect(userRoles.get('user-1')?.some((entry) => entry.role.id === roleId && entry.status === 'Active')).toBe(true);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe('user.role_assigned');
  });

  it('assigns and revokes roles for users', async () => {
    const roleId = Array.from(roleStore.values())[0].id;

    await roleService.assignRoleToUser('user-1', roleId, 'reason', { actorId: 'actor-1' as never, actorPermissions: ['iam.user.assign-role'], activeBranchId: null });
    expect(userRoles.get('user-1')?.some((entry) => entry.role.id === roleId && entry.status === 'Active')).toBe(true);

    await roleService.removeRoleFromUser('user-1', roleId, 'reason', { actorId: 'actor-1' as never, actorPermissions: ['iam.user.assign-role'], activeBranchId: null });
    expect(userRoles.get('user-1')?.find((entry) => entry.role.id === roleId)?.status).toBe('Revoked');
  });

  it('returns assigned permissions and user roles', async () => {
    const roleId = Array.from(roleStore.values())[0].id;
    expect(await roleService.getRolePermissions(roleId, { actorId: 'actor-1' as never, actorPermissions: ['iam.role.read'], activeBranchId: null })).toHaveLength(1);
    expect(await roleService.listRolesForUser('user-1', { actorId: 'actor-1' as never, actorPermissions: ['iam.user.read'], activeBranchId: null })).toHaveLength(1);
    expect(await roleService.listPermissions()).toHaveLength(permissionStore.size);
  });
});
