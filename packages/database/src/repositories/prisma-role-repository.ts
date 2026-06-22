import type { PrismaClient } from '@prisma/client';
import type { RoleRepository } from '@ims/identity-access';
import type { RoleRecord, PermissionRecord } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

type PermissionRow = {
  id: string;
  moduleCode: string;
  featureCode: string;
  actionCode: string;
  permissionCode: string;
  description: string | null;
  status: string;
};

type RoleRow = {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  status: string;
  permissions: Array<{
    permission: PermissionRow;
  }>;
};

export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toPermission(row: PermissionRow): PermissionRecord {
    return { ...row, id: row.id as Uuid };
  }

  private async toRole(row: RoleRow): Promise<RoleRecord> {
    return {
      id: row.id as Uuid,
      roleCode: row.roleCode,
      roleName: row.roleName,
      description: row.description,
      status: row.status as RoleRecord['status'],
      permissions: row.permissions.map((rp) => this.toPermission(rp.permission)),
    };
  }

  async findById(roleId: string): Promise<RoleRecord | null> {
    const row = await this.prisma.role.findFirst({
      where: { id: roleId, isDeleted: false },
      include: { permissions: { include: { permission: true } } },
    });
    return row ? this.toRole(row) : null;
  }

  async findByCode(roleCode: string): Promise<RoleRecord | null> {
    const row = await this.prisma.role.findFirst({
      where: { roleCode, isDeleted: false },
      include: { permissions: { include: { permission: true } } },
    });
    return row ? this.toRole(row) : null;
  }

  async create(role: RoleRecord): Promise<RoleRecord> {
    const row = await this.prisma.role.create({
      data: { id: role.id, roleCode: role.roleCode, roleName: role.roleName, description: role.description, status: role.status },
      include: { permissions: { include: { permission: true } } },
    });
    return this.toRole(row);
  }

  async update(
    roleId: string,
    updates: Partial<Pick<RoleRecord, 'roleName' | 'description' | 'status'>>,
  ): Promise<RoleRecord> {
    const row = await this.prisma.role.update({
      where: { id: roleId },
      data: { ...updates, updatedAt: new Date() },
      include: { permissions: { include: { permission: true } } },
    });
    return this.toRole(row);
  }

  async list(): Promise<RoleRecord[]> {
    const rows = await this.prisma.role.findMany({
      where: { isDeleted: false },
      include: { permissions: { include: { permission: true } } },
      orderBy: { roleName: 'asc' },
    });
    return Promise.all(rows.map((r: RoleRow) => this.toRole(r)));
  }

  async assignPermission(roleId: string, permissionId: string, actorId: string): Promise<void> {
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId, createdBy: actorId },
      update: {},
    });
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  async listPermissions(): Promise<PermissionRecord[]> {
    const rows = await this.prisma.permission.findMany({ where: { status: 'Active' }, orderBy: { permissionCode: 'asc' } });
    return rows.map(this.toPermission);
  }

  async seedPermissions(permissions: Omit<PermissionRecord, 'id'>[]): Promise<void> {
    for (const perm of permissions) {
      await this.prisma.permission.upsert({
        where: { permissionCode: perm.permissionCode },
        create: {
          id: crypto.randomUUID(),
          moduleCode: perm.moduleCode,
          featureCode: perm.featureCode,
          actionCode: perm.actionCode,
          permissionCode: perm.permissionCode,
          description: perm.description ?? null,
          status: 'Active',
        },
        update: { description: perm.description ?? null },
      });
    }
  }
}
