import bcrypt from 'bcryptjs';
import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import {
  createUserCommandSchema,
  updateUserCommandSchema,
  changePasswordCommandSchema,
  type UserProfile,
  type CreateUserCommand,
  type UpdateUserCommand,
  type ChangePasswordCommand,
  type UserListFilters,
} from '../domain/user';
import type { AuditLogRepository } from '@ims/audit';

export interface UserRepository {
  findById(userId: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  create(profile: UserProfile, passwordHash: string): Promise<UserProfile>;
  update(userId: string, updates: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'userType' | 'status'>>): Promise<UserProfile>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  list(filters?: UserListFilters): Promise<UserProfile[]>;
  assignRole(userId: string, roleId: string, actorId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  listRolesForUser(userId: string): Promise<Array<{ id: string; roleCode: string; roleName: string }>>;
}

export type UserCommandContext = { actorId: Uuid };

/**
 * UserService — CRUD lifecycle for IMS user accounts.
 * Authorization checks belong in route handlers or guards.
 */
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditLogRepository,
  ) {}

  async listUsers(filters?: UserListFilters): Promise<UserProfile[]> {
    return this.userRepository.list(filters);
  }

  async getUser(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new DomainError('not_found', `User ${userId} not found.`);
    return user;
  }


  async listRolesForUser(userId: string): Promise<Array<{ id: string; roleCode: string; roleName: string }>> {
    return this.userRepository.listRolesForUser(userId);
  }
  async createUser(command: CreateUserCommand, context: UserCommandContext): Promise<UserProfile> {
    const validated = createUserCommandSchema.parse(command);

    const existing = await this.userRepository.findByEmail(validated.email);
    if (existing) throw new DomainError('conflict', 'A user with that email already exists.');

    const passwordHash = await bcrypt.hash(validated.password, 12);

    const profile: UserProfile = {
      id: crypto.randomUUID() as Uuid,
      fullName: validated.fullName,
      email: validated.email,
      phone: validated.phone ?? null,
      userType: validated.userType,
      status: 'Active',
    };

    const saved = await this.userRepository.create(profile, passwordHash);

    for (const roleId of validated.roleIds) {
      await this.userRepository.assignRole(saved.id, roleId, context.actorId);
    }

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.user_created',
      entityType: 'User',
      entityId: saved.id,
      occurredAt: new Date(),
      details: { email: saved.email, userType: saved.userType },
    });

    return saved;
  }

  async updateUser(userId: string, command: UpdateUserCommand, context: UserCommandContext): Promise<UserProfile> {
    const validated = updateUserCommandSchema.parse(command);
    const existing = await this.userRepository.findById(userId);
    if (!existing) throw new DomainError('not_found', `User ${userId} not found.`);

    const updated = await this.userRepository.update(userId, validated);

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.user_updated',
      entityType: 'User',
      entityId: userId,
      occurredAt: new Date(),
      details: validated,
    });

    return updated;
  }

  async changePassword(command: ChangePasswordCommand, context: UserCommandContext): Promise<void> {
    const validated = changePasswordCommandSchema.parse(command);
    const existing = await this.userRepository.findById(validated.userId);
    if (!existing) throw new DomainError('not_found', `User ${validated.userId} not found.`);

    const passwordHash = await bcrypt.hash(validated.newPassword, 12);
    await this.userRepository.updatePassword(validated.userId, passwordHash);

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.user_password_changed',
      entityType: 'User',
      entityId: validated.userId,
      occurredAt: new Date(),
      details: {},
    });
  }

  async assignRole(userId: string, roleId: string, context: UserCommandContext): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new DomainError('not_found', `User ${userId} not found.`);

    await this.userRepository.assignRole(userId, roleId, context.actorId);

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.role_assigned',
      entityType: 'User',
      entityId: userId,
      occurredAt: new Date(),
      details: { roleId },
    });
  }

  async removeRole(userId: string, roleId: string, context: UserCommandContext): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new DomainError('not_found', `User ${userId} not found.`);

    await this.userRepository.removeRole(userId, roleId);

    await this.auditRepository.append({
      id: crypto.randomUUID(),
      actorId: context.actorId,
      branchId: null,
      action: 'identity.role_removed',
      entityType: 'User',
      entityId: userId,
      occurredAt: new Date(),
      details: { roleId },
    });
  }
}
