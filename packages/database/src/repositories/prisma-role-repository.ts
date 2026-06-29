import type { PrismaClient } from '@prisma/client';
import type { IRoleRepository, Role, RoleStatus } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRole(row: any): Role {
    return {
      id: row.id as Uuid,
      roleCode: row.roleCode,
      roleName: row.roleName,
      description: row.description,
      status: row.status as RoleStatus,
      isSystemRole: row.isSystemRole,
      version: row.version,
      effectiveStartDate: row.effectiveStartDate,
      effectiveEndDate: row.effectiveEndDate,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async findById(id: Uuid): Promise<Role | null> {
    const row = await this.prisma.role.findFirst({
      where: { id, isDeleted: false },
    });
    return row ? this.mapRole(row) : null;
  }

  async findByCode(code: string): Promise<Role | null> {
    const row = await this.prisma.role.findFirst({
      where: { roleCode: code, isDeleted: false },
    });
    return row ? this.mapRole(row) : null;
  }

  async create(role: Role): Promise<Role> {
    const row = await this.prisma.role.create({
      data: {
        id: role.id,
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description,
        status: role.status,
        isSystemRole: role.isSystemRole,
        version: role.version,
        effectiveStartDate: role.effectiveStartDate,
        effectiveEndDate: role.effectiveEndDate,
        createdBy: role.createdBy,
      },
    });
    return this.mapRole(row);
  }

  async update(role: Role): Promise<Role> {
    const row = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        roleName: role.roleName,
        description: role.description,
        status: role.status,
        isSystemRole: role.isSystemRole,
        version: { increment: 1 },
        effectiveStartDate: role.effectiveStartDate,
        effectiveEndDate: role.effectiveEndDate,
        updatedBy: role.updatedBy,
      },
    });
    return this.mapRole(row);
  }

  async archive(roleId: Uuid, actorId?: Uuid): Promise<void> {
    await this.prisma.role.update({
      where: { id: roleId },
      data: {
        status: 'Archived',
        deletedAt: new Date(),
        deletedBy: actorId ?? null,
        isDeleted: true,
      },
    });
  }

  async search(
    page: number,
    pageSize: number
  ): Promise<{ items: Role[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.role.findMany({
        where: { isDeleted: false },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { roleName: 'asc' },
      }),
      this.prisma.role.count({ where: { isDeleted: false } }),
    ]);

    return {
      items: rows.map((r) => this.mapRole(r)),
      total,
    };
  }

  async assignRoleToUser(userId: Uuid, roleId: Uuid, actorId: Uuid): Promise<void> {
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, status: 'Active', createdBy: actorId },
      update: { status: 'Active', revokedAt: null, revokedBy: null, reason: null, updatedBy: actorId },
    });
  }

  async revokeRoleFromUser(userId: Uuid, roleId: Uuid, actorId: Uuid, reason: string | null): Promise<void> {
    await this.prisma.userRole.update({
      where: { userId_roleId: { userId, roleId } },
      data: { status: 'Revoked', revokedAt: new Date(), revokedBy: actorId, reason },
    });
  }

  async listRolesForUser(userId: Uuid): Promise<{ role: Role; status: string; revokedAt: Date | null; revokedBy: string | null; reason: string | null }[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return rows.map((row) => ({
      role: this.mapRole(row.role),
      status: row.status,
      revokedAt: row.revokedAt,
      revokedBy: row.revokedBy,
      reason: row.reason,
    }));
  }

  async listUsersForRole(roleId: Uuid): Promise<{ userId: Uuid; username: string; status: string; fullName: string | null }[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { roleId, status: 'Active' },
      include: {
        user: {
          include: {
            person: true
          }
        }
      }
    });
    
    return rows.map((r) => {
      const p = r.user.person;
      return {
        userId: r.userId as Uuid,
        username: r.user.username,
        status: r.user.status,
        fullName: p ? `${p.firstName} ${p.lastName}`.trim() : null
      };
    });
  }

  async assignPermissionToRole(roleId: Uuid, permissionId: Uuid, actorId: Uuid): Promise<void> {
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId, createdBy: actorId },
      update: {},
    });
  }

  async removePermissionFromRole(roleId: Uuid, permissionId: Uuid): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
  }

  async listPermissionsForRole(roleId: Uuid): Promise<any[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((r) => ({
      id: r.permission.id,
      permissionCode: r.permission.permissionCode,
      permissionName: r.permission.permissionCode, // Map permissionCode to permissionName
      permissionType: r.permission.permissionType,
      description: r.permission.description,
      status: r.permission.status,
      createdAt: new Date(),
      createdBy: null,
      updatedAt: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
    }));
  }
}
