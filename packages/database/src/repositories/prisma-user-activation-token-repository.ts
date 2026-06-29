import type { PrismaClient } from '@prisma/client';
import type { IUserActivationTokenRepository, UserActivationTokenDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaUserActivationTokenRepository implements IUserActivationTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToken(row: any): UserActivationTokenDto {
    return {
      id: row.id as Uuid,
      userId: row.userId as Uuid,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      status: row.status as UserActivationTokenDto['status'],
      createdAt: row.createdAt,
      usedAt: row.usedAt,
    };
  }

  async create(token: UserActivationTokenDto): Promise<UserActivationTokenDto> {
    const row = await this.prisma.userActivationToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        status: token.status,
      },
    });
    return this.mapToken(row);
  }

  async findByHash(hash: string): Promise<UserActivationTokenDto | null> {
    const row = await this.prisma.userActivationToken.findFirst({
      where: { tokenHash: hash },
    });
    return row ? this.mapToken(row) : null;
  }

  async update(token: UserActivationTokenDto): Promise<UserActivationTokenDto> {
    const row = await this.prisma.userActivationToken.update({
      where: { id: token.id },
      data: {
        status: token.status,
        usedAt: token.usedAt,
      },
    });
    return this.mapToken(row);
  }

  async invalidatePendingForUser(userId: Uuid): Promise<void> {
    await this.prisma.userActivationToken.updateMany({
      where: { userId, status: 'Pending' },
      data: { status: 'Expired' },
    });
  }
}
