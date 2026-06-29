import type { PrismaClient } from '@prisma/client';
import type { IPasswordHistoryRepository, PasswordHistoryDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaPasswordHistoryRepository implements IPasswordHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(history: PasswordHistoryDto): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: {
        id: history.id,
        userId: history.userId,
        passwordHash: history.passwordHash,
        createdAt: history.createdAt,
      },
    });
  }

  async findRecentN(userId: Uuid, limit: number): Promise<PasswordHistoryDto[]> {
    const rows = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id as Uuid,
      userId: r.userId as Uuid,
      passwordHash: r.passwordHash,
      createdAt: r.createdAt,
    }));
  }
}
