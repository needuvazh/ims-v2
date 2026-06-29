import crypto from 'crypto';
import { DomainError } from '@ims/shared-kernel';
import type { Uuid } from '@ims/shared-kernel';
import {
  createUserCommandSchema,
  updateUserCommandSchema,
  type User,
  type Person,
  type UserListFilters,
  type CreateUserCommand,
  type UpdateUserCommand,
  type UserStatus,
  type UserType,
} from '../domain/user';
import { createIamError } from '../errors/iam-errors';
import type {
  IUserRepository,
  IRoleRepository,
  IUserBranchAccessRepository,
  IUserActivationTokenRepository,
  ISecurityPolicyRepository,
  IAuditLogRepository,
  INotificationRepository,
  IOutboxEventRepository,
  ISessionRepository,
  UserActivationTokenDto,
} from '../domain/repositories';

export interface UserCommandContext {
  actorId: string;
  actorPermissions?: string[];
  activeBranchId?: string | null;
}

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly userBranchAccessRepository: IUserBranchAccessRepository,
    private readonly userActivationTokenRepository: IUserActivationTokenRepository,
    private readonly securityPolicyRepository: ISecurityPolicyRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly outboxEventRepository: IOutboxEventRepository,
    private readonly sessionRepository: ISessionRepository
  ) {}

  private checkPermission(context: UserCommandContext, permission: string): void {
    if (context.actorPermissions && !context.actorPermissions.includes(permission)) {
      throw createIamError('IAM-AUTHZ-001');
    }
  }

  async createUser(command: CreateUserCommand, context: UserCommandContext): Promise<User> {
    this.checkPermission(context, 'iam.user.create');
    const validated = createUserCommandSchema.parse(command);
    const now = new Date();

    // Email uniqueness check
    const existingUser = await this.userRepository.findByEmail(validated.email);
    if (existingUser) {
      throw createIamError('IAM-VAL-001');
    }

    let firstName = validated.firstName || '';
    let lastName = validated.lastName || '';
    let mobile = validated.mobile || '';

    if (validated.fullName) {
      const parts = validated.fullName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    if (validated.phone) {
      mobile = validated.phone;
    }

    // Mobile uniqueness check
    if (mobile) {
      const existingPerson = await this.userRepository.findPersonByMobile(mobile);
      if (existingPerson) {
        throw createIamError('IAM-VAL-002');
      }
    }

    // Default branch verification
    const defaultBranchId = validated.defaultBranchId || null;
    if (defaultBranchId && !validated.branchIds.includes(defaultBranchId)) {
      throw createIamError('IAM-VAL-007');
    }

    const userId = crypto.randomUUID() as Uuid;
    const personId = crypto.randomUUID() as Uuid;

    const person: Person = {
      id: personId,
      firstName,
      lastName,
      mobile,
      nationalId: validated.nationalId || null,
      nationality: validated.nationality || null,
      dateOfBirth: validated.dateOfBirth || null,
      gender: validated.gender || null,
    };

    const user: User = {
      id: userId,
      personId,
      username: validated.email, // default username to email
      email: validated.email,
      userType: validated.userType,
      status: (validated.status as any) || 'PendingActivation',
      defaultBranchId: defaultBranchId as Uuid | null,
      preferredLanguage: validated.preferredLanguage || 'en',
      failedLoginCount: 0,
      lockedUntil: null,
      passwordChangedAt: null,
      version: 1,
      effectiveStartDate: validated.effectiveStartDate || now,
      effectiveEndDate: validated.effectiveEndDate || null,
      isDeleted: false,
    };

    // Save in DB
    const savedUser = await this.userRepository.create(user, person);

    // Assign roles & branch access
    // At least one role is required by schema validation
    for (const roleId of validated.roleIds) {
      const role = await this.roleRepository.findById(roleId as Uuid);
      if (!role || role.status !== 'Active') {
        throw createIamError('IAM-VAL-008');
      }
      // Set roles association via database or through user role assignments
      // Here we will use prisma via raw tx or standard logic. Since we map it,
      // let's do it using direct db model operations.
      // Wait, we can implement role/branch mappings inside user branch access repo or user repo!
      // In prisma-user-repository we didn't add role mappings since they are UserRole mapping tables.
      // Let's make sure we write UserRole and UserBranchAccess records.
      // We can do it inside this service using user branch access repository.
      // Wait, we have IUserBranchAccessRepository. What about UserRole?
      // Since roles are managed via UserRole entity, we can put standard role assignment methods in IRoleRepository or IUserRepository.
      // Let's add role association support to IRoleRepository or IUserRepository.
      // Wait! IRoleRepository in repos.ts:
      // We can add `assignRoleToUser(userId: Uuid, roleId: Uuid): Promise<void>`
      // and `removeRoleFromUser(userId: Uuid, roleId: Uuid): Promise<void>`.
      // Let's add them to `IRoleRepository` in repositories.ts.
      await (this.roleRepository as any).assignRoleToUser(savedUser.id, roleId as Uuid, context.actorId as Uuid);
    }

    // Branch assignments
    for (const branchId of validated.branchIds) {
      await this.userBranchAccessRepository.assign({
        id: crypto.randomUUID() as Uuid,
        userId: savedUser.id,
        branchId: branchId as Uuid,
        isDefault: branchId === defaultBranchId,
        includeChildBranches: false,
        consolidatedVisibility: validated.assignedOnly || false,
        status: 'Active',
        revokedAt: null,
        revokedBy: null,
        reason: null,
        createdAt: now,
        createdBy: context.actorId as Uuid,
        updatedAt: null,
        updatedBy: null,
      });
    }

    // Generate UserActivationToken
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    await this.userActivationTokenRepository.create({
      id: crypto.randomUUID() as Uuid,
      userId: savedUser.id,
      tokenHash,
      expiresAt,
      status: 'Pending',
      createdAt: now,
      usedAt: null,
    });

    // Notification persistence
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const activationLink = `${baseUrl}/activate-account?token=${rawToken}`;
    await this.notificationRepository.create({
      id: crypto.randomUUID() as Uuid,
      type: 'user.created',
      recipientUserId: savedUser.id,
      recipientEmail: savedUser.email,
      subject: 'Welcome to ASTI IMS',
      body: `Hello ${person.firstName},\n\nYour account has been created. Please activate it here: ${activationLink}`,
      status: 'Pending',
      metadata: { activationLink },
      providerResponse: null,
      createdAt: now,
      updatedAt: now,
    });

    // Outbox Event
    await this.outboxEventRepository.publish({
      id: crypto.randomUUID() as Uuid,
      eventType: 'UserCreated',
      payload: { userId: savedUser.id, email: savedUser.email },
      status: 'Pending',
      createdAt: now,
      processedAt: null,
      retryCount: 0,
    });

    // Audit Log
    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: now,
      entityType: 'User',
      entityId: savedUser.id,
      action: 'iam.user.created',
      oldValue: null,
      newValue: { email: savedUser.email, userType: savedUser.userType },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });

    return savedUser;
  }

  async updateUser(userId: string, command: UpdateUserCommand, context: UserCommandContext): Promise<User> {
    this.checkPermission(context, 'iam.user.update');
    const validated = updateUserCommandSchema.parse(command);
    const now = new Date();

    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) {
      throw createIamError('IAM-SYS-001'); // Not found error mapping
    }

    const oldUser = { ...user };
    const person = await this.userRepository.findPersonById(user.personId);
    if (!person) {
      throw createIamError('IAM-SYS-001');
    }
    const oldPerson = { ...person };

    if (validated.firstName !== undefined) person.firstName = validated.firstName;
    if (validated.lastName !== undefined) person.lastName = validated.lastName;
    if (validated.mobile !== undefined) person.mobile = validated.mobile;
    if (validated.nationalId !== undefined) person.nationalId = validated.nationalId;
    if (validated.nationality !== undefined) person.nationality = validated.nationality;
    if (validated.dateOfBirth !== undefined) person.dateOfBirth = validated.dateOfBirth;
    if (validated.gender !== undefined) person.gender = validated.gender;

    // Map legacy fields
    if (validated.fullName !== undefined) {
      const parts = validated.fullName.trim().split(/\s+/);
      person.firstName = parts[0] || '';
      person.lastName = parts.slice(1).join(' ') || '';
    }
    if (validated.phone !== undefined) {
      person.mobile = validated.phone || '';
    }

    if (validated.userType !== undefined) user.userType = validated.userType;
    if (validated.defaultBranchId !== undefined) user.defaultBranchId = validated.defaultBranchId as Uuid | null;
    if (validated.preferredLanguage !== undefined) user.preferredLanguage = validated.preferredLanguage;
    if (validated.effectiveStartDate !== undefined && validated.effectiveStartDate !== null) user.effectiveStartDate = validated.effectiveStartDate;
    if (validated.effectiveEndDate !== undefined) user.effectiveEndDate = validated.effectiveEndDate;
    if (validated.status !== undefined && validated.status !== null) {
      user.status = validated.status as any;
    }

    if (validated.branchIds !== undefined) {
      const existingAccess = await this.userBranchAccessRepository.findByUser(user.id);
      
      // Revoke any access to branches not in the new list
      for (const access of existingAccess) {
        if (access.status === 'Active' && !validated.branchIds.includes(access.branchId)) {
          access.status = 'Revoked';
          access.revokedAt = now;
          access.revokedBy = context.actorId;
          access.updatedAt = now;
          access.updatedBy = context.actorId;
          await this.userBranchAccessRepository.update(access);
        }
      }

      // Add or reactivate branches in the new list
      for (const branchId of validated.branchIds) {
        const match = existingAccess.find((a) => a.branchId === branchId);
        if (match) {
          if (match.status !== 'Active') {
            match.status = 'Active';
            match.revokedAt = null;
            match.revokedBy = null;
            match.reason = null;
            match.updatedAt = now;
            match.updatedBy = context.actorId;
            await this.userBranchAccessRepository.update(match);
          }
        } else {
          await this.userBranchAccessRepository.assign({
            id: crypto.randomUUID() as Uuid,
            userId: user.id,
            branchId: branchId as Uuid,
            isDefault: branchId === user.defaultBranchId,
            includeChildBranches: false,
            consolidatedVisibility: validated.assignedOnly || false,
            status: 'Active',
            revokedAt: null,
            revokedBy: null,
            reason: null,
            createdAt: now,
            createdBy: context.actorId as Uuid,
            updatedAt: null,
            updatedBy: null,
          });
        }
      }
    }

    user.updatedAt = now;
    user.updatedBy = context.actorId as Uuid;

    const updatedUser = await this.userRepository.update(user, person);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: now,
      entityType: 'User',
      entityId: userId,
      action: 'iam.user.updated',
      oldValue: { user: oldUser, person: oldPerson },
      newValue: { user: updatedUser, person },
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });

    return updatedUser;
  }

  async activateUser(userId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.activate');
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) throw createIamError('IAM-SYS-001');

    if (user.status !== 'Active') {
      const oldStatus = user.status;
      user.status = 'Active';
      await this.userRepository.update(user);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: context.actorId as Uuid,
        performedAt: new Date(),
        entityType: 'User',
        entityId: userId,
        action: 'iam.user.activated',
        oldValue: { status: oldStatus },
        newValue: { status: 'Active' },
        ipAddress: null,
        userAgent: null,
        branchId: context.activeBranchId as Uuid | null,
        correlationId: null,
        reason: null,
      });
    }
  }

  async activateAccountViaToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRecord = await this.userActivationTokenRepository.findByHash(tokenHash);
    const now = new Date();

    if (!tokenRecord || tokenRecord.status !== 'Pending' || tokenRecord.expiresAt < now) {
      throw createIamError('IAM-AUTH-006'); // invalid/expired token
    }

    const user = await this.userRepository.findById(tokenRecord.userId);
    if (!user) throw createIamError('IAM-SYS-001');

    user.status = 'Active';
    await this.userRepository.update(user);

    tokenRecord.status = 'Used';
    tokenRecord.usedAt = now;
    await this.userActivationTokenRepository.update(tokenRecord);

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: user.id,
      performedAt: now,
      entityType: 'User',
      entityId: user.id,
      action: 'iam.user.activated-via-token',
      oldValue: { status: 'PendingActivation' },
      newValue: { status: 'Active' },
      ipAddress: null,
      userAgent: null,
      branchId: user.defaultBranchId,
      correlationId: null,
      reason: null,
    });
  }

  async resendActivationEmail(userId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.activate');
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user || user.status !== 'PendingActivation') {
      throw createIamError('IAM-SYS-001');
    }

    const now = new Date();
    await this.userActivationTokenRepository.invalidatePendingForUser(userId as Uuid);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    await this.userActivationTokenRepository.create({
      id: crypto.randomUUID() as Uuid,
      userId: userId as Uuid,
      tokenHash,
      expiresAt,
      status: 'Pending',
      createdAt: now,
      usedAt: null,
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const activationLink = `${baseUrl}/activate-account?token=${rawToken}`;
    await this.notificationRepository.create({
      id: crypto.randomUUID() as Uuid,
      type: 'user.activation_resent',
      recipientUserId: user.id,
      recipientEmail: user.email,
      subject: 'Welcome to ASTI IMS - Activation Request',
      body: `Please activate your account here: ${activationLink}`,
      status: 'Pending',
      metadata: { activationLink },
      providerResponse: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: now,
      entityType: 'User',
      entityId: userId,
      action: 'iam.user.activation-email-resent',
      oldValue: null,
      newValue: null,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });
  }

  async suspendUser(userId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.suspend');
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) throw createIamError('IAM-SYS-001');

    if (user.status !== 'Suspended') {
      const oldStatus = user.status;
      user.status = 'Suspended';
      await this.userRepository.update(user);

      // Terminate all sessions
      await this.sessionRepository.revokeAllForUser(userId as Uuid);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: context.actorId as Uuid,
        performedAt: new Date(),
        entityType: 'User',
        entityId: userId,
        action: 'iam.user.suspended',
        oldValue: { status: oldStatus },
        newValue: { status: 'Suspended' },
        ipAddress: null,
        userAgent: null,
        branchId: context.activeBranchId as Uuid | null,
        correlationId: null,
        reason: null,
      });
    }
  }

  async archiveUser(userId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.archive');
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) throw createIamError('IAM-SYS-001');

    if (user.status !== 'Archived') {
      const oldStatus = user.status;
      user.status = 'Archived';
      user.isDeleted = true; // Soft delete
      await this.userRepository.update(user);

      // Terminate all sessions
      await this.sessionRepository.revokeAllForUser(userId as Uuid);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: context.actorId as Uuid,
        performedAt: new Date(),
        entityType: 'User',
        entityId: userId,
        action: 'iam.user.archived',
        oldValue: { status: oldStatus },
        newValue: { status: 'Archived', isDeleted: true },
        ipAddress: null,
        userAgent: null,
        branchId: context.activeBranchId as Uuid | null,
        correlationId: null,
        reason: null,
      });
    }
  }

  async unlockUser(userId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.unlock');
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) throw createIamError('IAM-SYS-001');

    if (user.status === 'Locked') {
      user.status = 'Active';
      user.failedLoginCount = 0;
      user.lockedUntil = null;
      await this.userRepository.update(user);

      await this.auditLogRepository.append({
        id: crypto.randomUUID() as Uuid,
        module: 'iam',
        performedBy: context.actorId as Uuid,
        performedAt: new Date(),
        entityType: 'User',
        entityId: userId,
        action: 'iam.user.unlocked',
        oldValue: { status: 'Locked' },
        newValue: { status: 'Active' },
        ipAddress: null,
        userAgent: null,
        branchId: context.activeBranchId as Uuid | null,
        correlationId: null,
        reason: null,
      });
    }
  }

  async adminResetPassword(userId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.reset-password');
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) throw createIamError('IAM-SYS-001');

    const now = new Date();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const policy = await this.securityPolicyRepository.get();
    const expiresAt = new Date(now.getTime() + policy.resetTokenExpiryMinutes * 60 * 1000);

    await (this.userRepository as any).createResetToken({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;
    await this.notificationRepository.create({
      id: crypto.randomUUID() as Uuid,
      type: 'user.password_reset_admin',
      recipientUserId: user.id,
      recipientEmail: user.email,
      subject: 'Password Reset Request',
      body: `An administrator has initiated a password reset. Reset here: ${resetLink}`,
      status: 'Pending',
      metadata: { resetLink },
      providerResponse: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.auditLogRepository.append({
      id: crypto.randomUUID() as Uuid,
      module: 'iam',
      performedBy: context.actorId as Uuid,
      performedAt: now,
      entityType: 'User',
      entityId: userId,
      action: 'iam.user.admin-reset-password-requested',
      oldValue: null,
      newValue: null,
      ipAddress: null,
      userAgent: null,
      branchId: context.activeBranchId as Uuid | null,
      correlationId: null,
      reason: null,
    });
  }

  async searchUsers(
    filters: UserListFilters,
    page: number,
    pageSize: number,
    context: UserCommandContext
  ): Promise<{ items: User[]; total: number }> {
    this.checkPermission(context, 'iam.user.read');
    // Enforce branch scope: if context has a branch, force filtering by it
    if (context.activeBranchId) {
      filters.branchId = context.activeBranchId as Uuid;
    }
    return this.userRepository.search(filters, page, pageSize);
  }

  async getUserById(userId: string, context: UserCommandContext): Promise<User> {
    this.checkPermission(context, 'iam.user.read');
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) throw createIamError('IAM-SYS-001');

    // Enforce branch scope if necessary
    if (context.activeBranchId) {
      const branches = await this.userBranchAccessRepository.findByUser(userId as Uuid);
      const isAssigned = branches.some(
        (b) => b.branchId === (context.activeBranchId as Uuid) && b.status === 'Active'
      );
      if (!isAssigned) {
        throw createIamError('IAM-AUTHZ-002');
      }
    }

    return user;
  }

  async getUser(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId as Uuid);
    if (!user) throw createIamError('IAM-SYS-001');
    const person = await this.userRepository.findPersonById(user.personId);
    return {
      ...user,
      fullName: person ? `${person.firstName} ${person.lastName}`.trim() : user.username,
      phone: person ? person.mobile : null,
    };
  }

  async assignRole(userId: string, roleId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.update');
    await (this.roleRepository as any).assignRoleToUser(userId as Uuid, roleId as Uuid, context.actorId as Uuid);
  }

  async removeRole(userId: string, roleId: string, context: UserCommandContext): Promise<void> {
    this.checkPermission(context, 'iam.user.update');
    await (this.roleRepository as any).revokeRoleFromUser(userId as Uuid, roleId as Uuid, context.actorId as Uuid, 'Revoked by admin');
  }

  async listRolesForUser(userId: string): Promise<any[]> {
    const list = await this.roleRepository.listRolesForUser(userId as Uuid);
    return list.map((ur) => ({
      id: ur.role.id,
      roleCode: ur.role.roleCode,
      roleName: ur.role.roleName,
    }));
  }

  async listUsers(): Promise<any[]> {
    const res = await this.userRepository.search({}, 1, 1000);
    const mapped = [];
    for (const u of res.items) {
      const person = await this.userRepository.findPersonById(u.personId);
      mapped.push({
        ...u,
        fullName: person ? `${person.firstName} ${person.lastName}`.trim() : u.username,
        phone: person ? person.mobile : null,
      });
    }
    return mapped;
  }
}
