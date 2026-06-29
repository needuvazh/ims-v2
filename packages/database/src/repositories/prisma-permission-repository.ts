import type { PrismaClient } from '@prisma/client';
import type { IPermissionRepository, Permission, PermissionType, PermissionStatus } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaPermissionRepository implements IPermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapPermission(row: any): Permission {
    return {
      id: row.id as Uuid,
      permissionCode: row.permissionCode,
      permissionName: row.permissionCode, // Map permissionCode to permissionName
      permissionType: row.permissionType as PermissionType,
      description: row.description,
      status: row.status as PermissionStatus,
      moduleCode: row.moduleCode,
      featureCode: row.featureCode,
      actionCode: row.actionCode,
      createdAt: new Date(),
      createdBy: null,
      updatedAt: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
    };
  }

  async findById(id: Uuid): Promise<Permission | null> {
    const row = await this.prisma.permission.findFirst({
      where: { id },
    });
    return row ? this.mapPermission(row) : null;
  }

  async findByCode(code: string): Promise<Permission | null> {
    const row = await this.prisma.permission.findFirst({
      where: { permissionCode: code },
    });
    return row ? this.mapPermission(row) : null;
  }

  async create(permission: Permission): Promise<Permission> {
    const parts = permission.permissionCode.split('.');
    const moduleCode = parts[0] || 'default';
    const featureCode = parts[1] || 'default';
    const actionCode = parts[2] || 'default';

    const row = await this.prisma.permission.create({
      data: {
        id: permission.id,
        moduleCode,
        featureCode,
        actionCode,
        permissionCode: permission.permissionCode,
        permissionType: permission.permissionType,
        description: permission.description,
        status: permission.status as any,
      },
    });
    return this.mapPermission(row);
  }

  async update(permission: Permission): Promise<Permission> {
    const row = await this.prisma.permission.update({
      where: { id: permission.id },
      data: {
        description: permission.description,
        status: permission.status as any,
      },
    });
    return this.mapPermission(row);
  }

  async archive(permissionId: Uuid, actorId?: Uuid): Promise<void> {
    await this.prisma.permission.update({
      where: { id: permissionId },
      data: {
        status: 'Archived',
      },
    });
  }

  async search(type?: string, status?: string): Promise<Permission[]> {
    const where: any = {};
    if (type) {
      where.permissionType = type;
    }
    if (status) {
      where.status = status;
    }
    const rows = await this.prisma.permission.findMany({
      where,
      orderBy: { permissionCode: 'asc' },
    });
    return rows.map((r) => this.mapPermission(r));
  }
}
