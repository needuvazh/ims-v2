import type { PrismaClient } from '@prisma/client';
import type { AuthSessionRepository } from '@ims/identity-access';

export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createSession(session: {
    userId: string;
    tokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.userSession.create({
      data: {
        userId: session.userId,
        tokenHash: session.tokenHash,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        status: 'Active',
        expiresAt: session.expiresAt,
        lastAccessAt: new Date(),
      },
    });
  }

  async getSessionByHash(tokenHash: string): Promise<{ status: string; expiresAt: Date } | null> {
    const row = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      select: {
        status: true,
        expiresAt: true,
      },
    });
    return row;
  }

  async revokeSessionByHash(tokenHash: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { tokenHash },
      data: {
        status: 'Revoked',
      },
    });
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, status: 'Active' },
      data: {
        status: 'Revoked',
      },
    });
  }
}
