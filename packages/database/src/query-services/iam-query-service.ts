import type { PrismaClient } from '@prisma/client';

export class IamQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActiveUsersByRoleAndBranch(roleCode: string, branchId: string): Promise<{ id: string; username: string }[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'Active',
        isDeleted: false,
        roles: {
          some: {
            role: {
              roleCode: roleCode,
              status: 'Active',
              isDeleted: false,
            },
            status: 'Active',
          },
        },
        branchAccess: {
          some: {
            branchId,
            status: 'Active',
          },
        },
      },
      select: {
        id: true,
        username: true,
      },
    });
    return users;
  }
}
