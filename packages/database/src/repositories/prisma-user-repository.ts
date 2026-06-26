import type { PrismaClient } from '@prisma/client';
import type { AuthUserRepository, UserRepository } from '@ims/identity-access';
import type { UserProfile, UserWithCredentials, UserListFilters } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

type PermissionCodeRow = {
  permission: {
    permissionCode: string;
  };
};

type UserRoleWithPermissionsRow = {
  role: {
    roleCode: string;
    permissions: PermissionCodeRow[];
  };
};

type UserRoleSummaryRow = {
  role: {
    id: string;
    roleCode: string;
    roleName: string;
  };
};

type UserDataScopeRow = {
  scopeType: string;
  branchId: string | null;
  departmentId: string | null;
  assignedOnly: boolean;
};

type UserProfileRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  userType: string;
  status: string;
  lastLoginAt: Date | null;
  isDeleted: boolean;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  roles?: UserRoleSummaryRow[];
  dataScopes?: UserDataScopeRow[];
};

type UserRoleListRow = {
  role: {
    id: string;
    roleCode: string;
    roleName: string;
  };
};

type UserWithCredentialsRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  userType: string;
  status: string;
  lastLoginAt: Date | null;
  passwordHash: string;
  isDeleted: boolean;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  roles: UserRoleWithPermissionsRow[];
  dataScopes: UserDataScopeRow[];
};

export class PrismaUserRepository implements UserRepository, AuthUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toProfile(
    row: Pick<
      UserProfileRow,
      'id' | 'fullName' | 'email' | 'phone' | 'userType' | 'status' | 'lastLoginAt' | 'effectiveStartDate' | 'effectiveEndDate'
    > & {
      roles?: UserRoleSummaryRow[];
      dataScopes?: UserDataScopeRow[];
    },
  ): UserProfile {
    return {
      id: row.id as Uuid,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      // Cast: DB stores a raw string; Zod schema at API boundary ensures only valid UserType values are written.
      userType: row.userType as UserProfile['userType'],
      status: row.status as UserProfile['status'],
      lastLoginAt: row.lastLoginAt,
      roleCount: row.roles?.length,
      roleSummaries: row.roles?.map((item) => ({
        id: item.role.id as Uuid,
        roleCode: item.role.roleCode,
        roleName: item.role.roleName,
      })),
      dataScopes: row.dataScopes?.map((scope) => ({
        scopeType: scope.scopeType,
        branchId: scope.branchId,
        departmentId: scope.departmentId,
        assignedOnly: scope.assignedOnly,
      })),
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
              OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: now } }],
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  where: { permission: { status: 'Active' } },
                  include: { permission: true },
                },
              },
            },
          },
        },
        dataScopes: true,
      },
    })) as UserWithCredentialsRow | null;

    if (!row || row.isDeleted) return null;

    const roles = row.roles.map((userRole) => userRole.role.roleCode);
    const permissions = row.roles.flatMap((userRole) =>
      userRole.role.permissions.map((permissionRow) => permissionRow.permission.permissionCode),
    );

    return {
      id: row.id as Uuid,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      userType: row.userType as UserProfile['userType'],
      status: row.status as UserProfile['status'],
      lastLoginAt: row.lastLoginAt,
      passwordHash: row.passwordHash,
      roles: [...new Set(roles)],
      permissions: [...new Set(permissions)],
      dataScopes: row.dataScopes.map((scope) => ({
        scopeType: scope.scopeType,
        branchId: scope.branchId,
        departmentId: scope.departmentId,
        assignedOnly: scope.assignedOnly,
      })),
      effectiveStartDate: row.effectiveStartDate,
      effectiveEndDate: row.effectiveEndDate,
      failedLoginAttempts: row.failedLoginAttempts,
      lockoutUntil: row.lockoutUntil,
    };
  }

  async findByIdWithCredentials(userId: string): Promise<UserWithCredentials | null> {
    const now = new Date();
    const row = (await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: {
            role: {
              status: 'Active',
              effectiveStartDate: { lte: now },
              OR: [{ effectiveEndDate: null }, { effectiveEndDate: { gte: now } }],
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  where: { permission: { status: 'Active' } },
                  include: { permission: true },
                },
              },
            },
          },
        },
        dataScopes: true,
      },
    })) as UserWithCredentialsRow | null;

    if (!row || row.isDeleted) return null;

    const roles = row.roles.map((userRole) => userRole.role.roleCode);
    const permissions = row.roles.flatMap((userRole) =>
      userRole.role.permissions.map((permissionRow) => permissionRow.permission.permissionCode),
    );

    return {
      id: row.id as Uuid,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      userType: row.userType as UserProfile['userType'],
      status: row.status as UserProfile['status'],
      lastLoginAt: row.lastLoginAt,
      passwordHash: row.passwordHash,
      roles: [...new Set(roles)],
      permissions: [...new Set(permissions)],
      dataScopes: row.dataScopes.map((scope) => ({
        scopeType: scope.scopeType,
        branchId: scope.branchId,
        departmentId: scope.departmentId,
        assignedOnly: scope.assignedOnly,
      })),
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
    const row = (await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
              },
            },
          },
        },
        dataScopes: true,
      },
    })) as UserProfileRow | null;

    return row && !row.isDeleted ? this.toProfile(row) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const row = (await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
              },
            },
          },
        },
        dataScopes: true,
      },
    })) as UserProfileRow | null;

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
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
              },
            },
          },
        },
        dataScopes: true,
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
      data: {
        ...(updates.fullName !== undefined && { fullName: updates.fullName }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.userType !== undefined && { userType: updates.userType }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.effectiveStartDate !== undefined && { effectiveStartDate: updates.effectiveStartDate }),
        ...(updates.effectiveEndDate !== undefined && { effectiveEndDate: updates.effectiveEndDate }),
        updatedAt: new Date(),
      },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
              },
            },
          },
        },
        dataScopes: true,
      },
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
        ...(filters?.search
          ? {
              OR: [
                { fullName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
              },
            },
          },
        },
        dataScopes: true,
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

    return rows.map((row) => ({
      id: row.role.id,
      roleCode: row.role.roleCode,
      roleName: row.role.roleName,
    }));
  }

  async replaceDataScopes(
    userId: string,
    scopes: Array<{
      scopeType: string;
      branchId: string | null;
      departmentId: string | null;
      assignedOnly: boolean;
    }>,
    actorId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userDataScope.deleteMany({ where: { userId } }),
      this.prisma.userDataScope.createMany({
        data: scopes.map((scope) => ({
          userId,
          scopeType: scope.scopeType,
          branchId: scope.branchId,
          departmentId: scope.departmentId,
          assignedOnly: scope.assignedOnly,
          createdBy: actorId,
        })),
      }),
    ]);
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
