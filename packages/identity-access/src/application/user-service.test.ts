import { describe, expect, it, beforeEach } from 'vitest';
import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import { UserService, type UserRepository } from './user-service';
import type { RoleRepository } from './role-service';
import { InMemoryAuditLogRepository } from '@ims/audit';
import type { UserProfile } from '../domain/user';
import type { RoleRecord } from '../domain/role';

describe('UserService Lifecycle Invariant and Audit Tests', () => {
  let userService: UserService;
  let mockUserRepo: UserRepository;
  let mockRoleRepo: RoleRepository;
  let mockAuditRepo: InMemoryAuditLogRepository;

  const userActorId = crypto.randomUUID() as Uuid;

  const activeRole: RoleRecord = {
    id: 'e4a055d2-f4fb-4b53-bcf7-6bc834241ad1' as Uuid,
    roleCode: 'ROLE_ACTIVE',
    roleName: 'Active Role',
    description: null,
    status: 'Active',
    permissions: [],
  };

  const inactiveRole: RoleRecord = {
    id: '38d7fb2e-68de-47cc-ae90-c1184ff5f18c' as Uuid,
    roleCode: 'ROLE_INACTIVE',
    roleName: 'Inactive Role',
    description: null,
    status: 'Inactive',
    permissions: [],
  };

  const existingUser: UserProfile = {
    id: 'dcd16b08-8e68-45be-bbfe-81d3ee6b69fa' as Uuid,
    fullName: 'Existing User',
    email: 'existing@example.com',
    phone: null,
    userType: 'Admin',
    status: 'Active',
  };

  beforeEach(() => {
    mockAuditRepo = new InMemoryAuditLogRepository();

    const users = new Map<string, UserProfile>();
    const usersByEmail = new Map<string, UserProfile>();
    users.set(existingUser.id, { ...existingUser });
    usersByEmail.set(existingUser.email, { ...existingUser });

    const roles = new Map<string, RoleRecord>();
    roles.set(activeRole.id, activeRole);
    roles.set(inactiveRole.id, inactiveRole);

    mockUserRepo = {
      findById: async (id) => users.get(id) ?? null,
      findByEmail: async (email) => usersByEmail.get(email) ?? null,
      create: async (profile, hash) => {
        users.set(profile.id, profile);
        usersByEmail.set(profile.email, profile);
        return profile;
      },
      update: async (id, updates) => {
        const u = users.get(id);
        if (!u) throw new Error('Not found');
        const updated = { ...u, ...updates };
        users.set(id, updated);
        usersByEmail.set(updated.email, updated);
        return updated;
      },
      updatePassword: async () => {},
      list: async () => Array.from(users.values()),
      assignRole: async () => {},
      removeRole: async () => {},
      listRolesForUser: async () => [],
    };

    mockRoleRepo = {
      findById: async (id) => roles.get(id) ?? null,
      findByCode: async () => null,
      create: async (role) => role,
      update: async (id, updates) => ({ ...activeRole, ...updates }),
      list: async () => Array.from(roles.values()),
      assignPermission: async () => {},
      removePermission: async () => {},
      listPermissions: async () => [],
      seedPermissions: async () => {},
    };

    userService = new UserService(mockUserRepo, mockRoleRepo, mockAuditRepo);
  });

  describe('assignRole validation checks', () => {
    it('successfully assigns an active role to a user', async () => {
      await expect(
        userService.assignRole(existingUser.id, activeRole.id, { actorId: userActorId })
      ).resolves.not.toThrow();

      const auditLogs = mockAuditRepo.list();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('identity.role_assigned');
    });

    it('fails to assign a deactivated role and throws precondition_failed', async () => {
      await expect(
        userService.assignRole(existingUser.id, inactiveRole.id, { actorId: userActorId })
      ).rejects.toThrowError(
        new DomainError('precondition_failed', `Cannot assign role: Role ${inactiveRole.roleCode} is not active.`)
      );

      expect(mockAuditRepo.list()).toHaveLength(0);
    });

    it('fails if the role does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000999';
      await expect(
        userService.assignRole(existingUser.id, nonExistentId, { actorId: userActorId })
      ).rejects.toThrowError(
        new DomainError('not_found', `Role ${nonExistentId} not found.`)
      );
    });
  });

  describe('createUser role validation checks', () => {
    it('successfully creates user with active roles', async () => {
      const newUser = await userService.createUser(
        {
          fullName: 'New User',
          email: 'new@example.com',
          phone: null,
          userType: 'Admin',
          password: 'Password123!',
          roleIds: [activeRole.id],
        },
        { actorId: userActorId }
      );

      expect(newUser.email).toBe('new@example.com');
      const auditLogs = mockAuditRepo.list();
      expect(auditLogs.some(log => log.action === 'identity.user_created')).toBe(true);
    });

    it('fails to create user if any role is deactivated', async () => {
      await expect(
        userService.createUser(
          {
            fullName: 'New User',
            email: 'new@example.com',
            phone: null,
            userType: 'Admin',
            password: 'Password123!',
            roleIds: [inactiveRole.id],
          },
          { actorId: userActorId }
        )
      ).rejects.toThrowError(
        new DomainError('precondition_failed', `Cannot assign role: Role ${inactiveRole.roleCode} is not active.`)
      );
    });
  });

  describe('updateUser granular status audit logging', () => {
    it('logs identity.user_activated when status transitions to Active', async () => {
      // Setup existing user to be Inactive first
      await mockUserRepo.update(existingUser.id, { status: 'Inactive' });

      await userService.updateUser(
        existingUser.id,
        { status: 'Active' },
        { actorId: userActorId }
      );

      const auditLogs = mockAuditRepo.list();
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog.action).toBe('identity.user_activated');
    });

    it('logs identity.user_deactivated when status transitions to Inactive', async () => {
      await userService.updateUser(
        existingUser.id,
        { status: 'Inactive' },
        { actorId: userActorId }
      );

      const auditLogs = mockAuditRepo.list();
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog.action).toBe('identity.user_deactivated');
    });

    it('logs identity.user_locked when status transitions to Locked', async () => {
      await userService.updateUser(
        existingUser.id,
        { status: 'Locked' },
        { actorId: userActorId }
      );

      const auditLogs = mockAuditRepo.list();
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog.action).toBe('identity.user_locked');
    });

    it('logs standard identity.user_updated when details change without status changes', async () => {
      await userService.updateUser(
        existingUser.id,
        { fullName: 'Updated Full Name' },
        { actorId: userActorId }
      );

      const auditLogs = mockAuditRepo.list();
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog.action).toBe('identity.user_updated');
    });
  });
});
