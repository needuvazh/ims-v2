import type { PrismaClient } from '@prisma/client';
import type { AuthUserRepository, UserRepository } from '@ims/identity-access';
import type { UserProfile, UserWithCredentials, UserListFilters } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

type PermissionCodeRow = {
  permission: {
    permissionCode: string;
  };
};

type UserRoleRow = {
  role: {
    roleCode: string;
    permissions: PermissionCodeRow[];
  };
};

type UserDataScopeRow = {
  scopeType: string;
  branchId: string | null;
  departmentId: string | null;
  assignedOnly: boolean;
};

type UserWithCredentialsRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  userType: string;
  status: string;
  passwordHash: string;
  isDeleted: boolean;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  roles: UserRoleRow[];
  dataScopes: UserDataScopeRow[];
};

type UserProfileRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  userType: string;
  status: string;
  isDeleted: boolean;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
};

type UserRoleListRow = {
  role: {
    id: string;
    roleCode: string;
    roleName: string;
  };
};

export class PrismaUserRepository implements UserRepository, AuthUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toProfile(row: {
    id: string; fullName: string; email: string; phone: string | null;
    userType: string; status: string; effectiveStartDate: Date; effectiveEndDate: Date | null;
  }): UserProfile {
    return { 
      id: row.id as Uuid,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      userType: row.userType,
      status: row.status as UserProfile['status'],
      effectiveStartDate: row.effectiveStartDate,
      effectiveEndDate: row.effectiveEndDate,
    };
  }

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    const now = new Date();
    const row = (await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          where: {
            role: {
              status: 'Active',
              effectiveStartDate: { lte: now },
              OR: [
                { effectiveEndDate: null },
                { effectiveEndDate: { gte: now } }
              ]
            }
          },
          include: {
            role: {
              include: {
                permissions: {
                  where: { permission: { status: 'Active' } },
                  include: { permission: true }
                },
              },
            },
          },
        },
        dataScopes: true,
      },
    })) as UserWithCredentialsRow | null;

    if (!row || row.isDeleted) return null;

    const roles = row.roles.map((userRole: UserRoleRow) => userRole.role.roleCode);
    const permissions = row.roles.flatMap((userRole: UserRoleRow) =>
      userRole.role.permissions.map((permissionRow: PermissionCodeRow) => permissionRow.permission.permissionCode),
    );

    const dataScopes = (row.dataScopes || []).map((ds) => ({
      scopeType: ds.scopeType,
      branchId: ds.branchId,
      departmentId: ds.departmentId,
      assignedOnly: ds.assignedOnly,
    }));

    return {
      id: row.id as Uuid,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      userType: row.userType,
      status: row.status as UserProfile['status'],
      passwordHash: row.passwordHash,
      roles: [...new Set(roles)],
      permissions: [...new Set(permissions)],
      dataScopes,
      effectiveStartDate: row.effectiveStartDate,
      effectiveEndDate: row.effectiveEndDate,
      failedLoginAttempts: row.failedLoginAttempts,
      lockoutUntil: row.lockoutUntil,
    };
  }

  async recordLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async findById(userId: string): Promise<UserProfile | null> {
    const row = (await this.prisma.user.findFirst({ where: { id: userId, isDeleted: false } })) as
      | UserProfileRow
      | null;
    return row ? this.toProfile(row) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const row = (await this.prisma.user.findUnique({ where: { email } })) as UserProfileRow | null;
    return row && !row.isDeleted ? this.toProfile(row) : null;
  }

  async create(profile: UserProfile, passwordHash: string): Promise<UserProfile> {
    const row = (await this.prisma.user.create({
      data: {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        userType: profile.userType,
        status: profile.status,
        passwordHash,
        effectiveStartDate: profile.effectiveStartDate ?? undefined,
        effectiveEndDate: profile.effectiveEndDate ?? null,
      },
    })) as UserProfileRow;
    return this.toProfile(row);
  }

  async update(
    userId: string,
    updates: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'userType' | 'status' | 'effectiveStartDate' | 'effectiveEndDate'>>,
  ): Promise<UserProfile> {
    const row = (await this.prisma.user.update({
      where: { id: userId },
      data: { ...updates, updatedAt: new Date() },
    })) as UserProfileRow;
    return this.toProfile(row);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, updatedAt: new Date() } });
  }

  async list(filters?: UserListFilters): Promise<UserProfile[]> {
    const rows = (await this.prisma.user.findMany({
      where: {
        isDeleted: false,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.userType ? { userType: filters.userType } : {}),
        ...(filters?.search ? {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { fullName: 'asc' },
    })) as UserProfileRow[];
    return rows.map((row) => this.toProfile(row));
  }

  async assignRole(userId: string, roleId: string, actorId: string): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, createdBy: actorId },
      update: {},
    });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
  }

  async listRolesForUser(userId: string) {
    const rows = (await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { select: { id: true, roleCode: true, roleName: true } } },
    })) as UserRoleListRow[];
    return rows.map((row: UserRoleListRow) => ({
      id: row.role.id,
      roleCode: row.role.roleCode,
      roleName: row.role.roleName,
    }));
  }

  async incrementFailedAttempts(userId: string, lockoutMinutes = 15): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const attempts = user.failedLoginAttempts + 1;
    const lockoutUntil = attempts >= 5 ? new Date(Date.now() + lockoutMinutes * 60 * 1000) : null;
    const status = attempts >= 5 ? 'Locked' : user.status;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockoutUntil,
        status,
      },
    });
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  }

  async updatePasswordAndUnlock(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        status: 'Active',
        updatedAt: new Date(),
      },
    });
  }
}
