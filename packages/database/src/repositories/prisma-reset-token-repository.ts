import type { PrismaClient } from '@prisma/client';

export interface AuthResetTokenRepository {
  createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findActiveTokenByHash(tokenHash: string): Promise<{
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
  markTokenAsUsed(tokenHash: string): Promise<void>;
}

export class PrismaAuthResetTokenRepository implements AuthResetTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findActiveTokenByHash(tokenHash: string): Promise<{
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });
    return row;
  }

  async markTokenAsUsed(tokenHash: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { tokenHash },
      data: {
        usedAt: new Date(),
      },
    });
  }
}
