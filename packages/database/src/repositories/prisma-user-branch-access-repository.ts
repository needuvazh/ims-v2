import type { PrismaClient } from '@prisma/client';
import type { IUserBranchAccessRepository, UserBranchAccess, UserBranchAccessStatus } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaUserBranchAccessRepository implements IUserBranchAccessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapAccess(row: any): UserBranchAccess {
    return {
      id: row.id as Uuid,
      userId: row.userId as Uuid,
      branchId: row.branchId as Uuid,
      isDefault: row.isDefault,
      includeChildBranches: row.includeChildBranches,
      consolidatedVisibility: row.consolidatedVisibility,
      status: row.status as UserBranchAccessStatus,
      revokedAt: row.revokedAt,
      revokedBy: row.revokedBy,
      reason: row.reason,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  async findByUser(userId: Uuid): Promise<UserBranchAccess[]> {
    const rows = await this.prisma.userBranchAccess.findMany({
      where: { userId },
    });
    return rows.map((r) => this.mapAccess(r));
  }

  async findById(id: Uuid): Promise<UserBranchAccess | null> {
    const row = await this.prisma.userBranchAccess.findUnique({
      where: { id },
    });
    return row ? this.mapAccess(row) : null;
  }

  async assign(access: UserBranchAccess): Promise<UserBranchAccess> {
    return this.prisma.$transaction(async (tx) => {
      if (access.isDefault) {
        // Set all other assignments to non-default
        await tx.userBranchAccess.updateMany({
          where: { userId: access.userId },
          data: { isDefault: false },
        });
        await tx.user.update({
          where: { id: access.userId },
          data: { defaultBranchId: access.branchId },
        });
      }

      const row = await tx.userBranchAccess.create({
        data: {
          id: access.id,
          userId: access.userId,
          branchId: access.branchId,
          isDefault: access.isDefault,
          includeChildBranches: access.includeChildBranches,
          consolidatedVisibility: access.consolidatedVisibility,
          status: access.status,
          createdBy: access.createdBy,
        },
      });
      return this.mapAccess(row);
    });
  }

  async update(access: UserBranchAccess): Promise<UserBranchAccess> {
    return this.prisma.$transaction(async (tx) => {
      if (access.isDefault) {
        await tx.userBranchAccess.updateMany({
          where: { userId: access.userId, id: { not: access.id } },
          data: { isDefault: false },
        });
        await tx.user.update({
          where: { id: access.userId },
          data: { defaultBranchId: access.branchId },
        });
      }

      const row = await tx.userBranchAccess.update({
        where: { id: access.id },
        data: {
          isDefault: access.isDefault,
          includeChildBranches: access.includeChildBranches,
          consolidatedVisibility: access.consolidatedVisibility,
          status: access.status,
          revokedAt: access.revokedAt,
          revokedBy: access.revokedBy,
          reason: access.reason,
          updatedBy: access.updatedBy,
        },
      });
      return this.mapAccess(row);
    });
  }

  async remove(userId: Uuid, branchId: Uuid, actorId?: Uuid, reason: string | null = null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.userBranchAccess.findUnique({
        where: { userId_branchId: { userId, branchId } },
      });

      if (!row) return;

      await tx.userBranchAccess.update({
        where: { id: row.id },
        data: {
          status: 'Revoked',
          revokedAt: new Date(),
          revokedBy: actorId ?? null,
          reason,
          updatedBy: actorId ?? null,
        },
      });
    });
  }

  async setDefault(userId: Uuid, branchId: Uuid, actorId?: Uuid): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userBranchAccess.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      await tx.userBranchAccess.update({
        where: { userId_branchId: { userId, branchId } },
        data: {
          isDefault: true,
          updatedBy: actorId ?? null,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          defaultBranchId: branchId,
          updatedBy: actorId ?? null,
        },
      });
    });
  }

  async resolveChildBranchIds(branchId: Uuid): Promise<Uuid[]> {
    const allBranches = await this.prisma.branch.findMany({
      where: { status: 'Active', isDeleted: false },
      select: { id: true, parentBranchId: true }
    });

    const childrenMap = new Map<string, string[]>();
    for (const b of allBranches) {
      if (b.parentBranchId) {
        const list = childrenMap.get(b.parentBranchId) || [];
        list.push(b.id);
        childrenMap.set(b.parentBranchId, list);
      }
    }

    const result: Uuid[] = [];
    const queue: string[] = [branchId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenMap.get(current) || [];
      for (const childId of children) {
        if (!result.includes(childId as Uuid)) {
          result.push(childId as Uuid);
          queue.push(childId);
        }
      }
    }
    return result;
  }
}
