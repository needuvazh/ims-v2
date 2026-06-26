import { describe, expect, it, beforeEach } from 'vitest';
import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import { RoleService, type RoleRepository } from './role-service';
import { InMemoryAuditLogRepository } from '@ims/audit';
import type { RoleRecord, PermissionRecord } from '../domain/role';

describe('RoleService Lifecycle Invariant and Audit Tests', () => {
  let roleService: RoleService;
  let mockRoleRepo: RoleRepository;
  let mockAuditRepo: InMemoryAuditLogRepository;

  const userActorId = crypto.randomUUID() as Uuid;

  const existingRole: RoleRecord = {
    id: '7d5ef9b1-ecce-4889-b1d8-3cd9a04a572a' as Uuid,
    roleCode: 'ROLE_TEST',
    roleName: 'Test Role',
    description: null,
    status: 'Active',
    permissions: [],
  };

  const activePermission: PermissionRecord = {
    id: '9488a0e8-0b5c-4d37-88ba-38a531e21b8f' as Uuid,
    permissionCode: 'perm.active',
    moduleCode: 'test',
    featureCode: 'test',
    actionCode: 'test',
    permissionType: 'Action',
    description: null,
    status: 'Active',
  };

  const inactivePermission: PermissionRecord = {
    id: '2df1f24d-6161-46ab-8422-4809bb68cfdf' as Uuid,
    permissionCode: 'perm.inactive',
    moduleCode: 'test',
    featureCode: 'test',
    actionCode: 'test',
    permissionType: 'Action',
    description: null,
    status: 'Inactive',
  };

  beforeEach(() => {
    mockAuditRepo = new InMemoryAuditLogRepository();

    const roles = new Map<string, RoleRecord>();
    roles.set(existingRole.id, { ...existingRole });

    const permissions = new Map<string, PermissionRecord>();
    permissions.set(activePermission.id, activePermission);
    permissions.set(inactivePermission.id, inactivePermission);

    mockRoleRepo = {
      findById: async (id) => roles.get(id) ?? null,
      findByCode: async (code) => Array.from(roles.values()).find(r => r.roleCode === code) ?? null,
      create: async (role) => {
        roles.set(role.id, role);
        return role;
      },
      update: async (id, updates) => {
        const r = roles.get(id);
        if (!r) throw new Error('Not found');
        const updated = { ...r, ...updates };
        roles.set(id, updated);
        return updated;
      },
      list: async () => Array.from(roles.values()),
      assignPermission: async () => {},
      removePermission: async () => {},
      listPermissions: async () => Array.from(permissions.values()),
      seedPermissions: async () => {},
    };

    roleService = new RoleService(mockRoleRepo, mockAuditRepo);
  });

  describe('assignPermission validation checks', () => {
    it('successfully assigns an active permission to a role', async () => {
      await expect(
        roleService.assignPermission(existingRole.id, activePermission.id, { actorId: userActorId })
      ).resolves.not.toThrow();

      const auditLogs = mockAuditRepo.list();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('identity.permission_assigned');
    });

    it('fails to assign a deactivated permission and throws precondition_failed', async () => {
      await expect(
        roleService.assignPermission(existingRole.id, inactivePermission.id, { actorId: userActorId })
      ).rejects.toThrowError(
        new DomainError('precondition_failed', `Cannot assign permission: Permission ${inactivePermission.permissionCode} is not active.`)
      );

      expect(mockAuditRepo.list()).toHaveLength(0);
    });

    it('fails if the permission does not exist', async () => {
      const nonExistentPermId = '00000000-0000-0000-0000-000000000999';
      await expect(
        roleService.assignPermission(existingRole.id, nonExistentPermId, { actorId: userActorId })
      ).rejects.toThrowError(
        new DomainError('not_found', `Permission ${nonExistentPermId} not found.`)
      );
    });
  });

  describe('createRole permission validation checks', () => {
    it('successfully creates role with active permissions', async () => {
      const newRole = await roleService.createRole(
        {
          roleCode: 'ROLE_NEW',
          roleName: 'New Role',
          description: null,
          permissionIds: [activePermission.id],
        },
        { actorId: userActorId }
      );

      expect(newRole.roleCode).toBe('ROLE_NEW');
      const auditLogs = mockAuditRepo.list();
      expect(auditLogs.some(log => log.action === 'identity.role_created')).toBe(true);
    });

    it('fails to create role if any permission is deactivated', async () => {
      await expect(
        roleService.createRole(
          {
            roleCode: 'ROLE_NEW',
            roleName: 'New Role',
            description: null,
            permissionIds: [inactivePermission.id],
          },
          { actorId: userActorId }
        )
      ).rejects.toThrowError(
        new DomainError('precondition_failed', `Cannot assign permission: Permission ${inactivePermission.permissionCode} is not active.`)
      );
    });
  });

  describe('updateRole granular status audit logging', () => {
    it('logs identity.role_deactivated when status transitions to Inactive', async () => {
      await roleService.updateRole(
        existingRole.id,
        { status: 'Inactive' },
        { actorId: userActorId }
      );

      const auditLogs = mockAuditRepo.list();
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog.action).toBe('identity.role_deactivated');
    });

    it('logs standard identity.role_updated when status remains unchanged', async () => {
      await roleService.updateRole(
        existingRole.id,
        { roleName: 'New Role Name' },
        { actorId: userActorId }
      );

      const auditLogs = mockAuditRepo.list();
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog.action).toBe('identity.role_updated');
    });
  });
});
