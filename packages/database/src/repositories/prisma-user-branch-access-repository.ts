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
}
