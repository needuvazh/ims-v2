import type { PrismaClient } from '@prisma/client';
import type { ISessionRepository, UserSessionDto } from '@ims/identity-access';
import { createUuid, type Uuid } from '@ims/shared-kernel';
import crypto from 'crypto';

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createSession(session: {
    userId: Uuid;
    tokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
    activeBranchId?: Uuid | null;
  }): Promise<UserSessionDto> {
    return this.create({
      id: createUuid(crypto.randomUUID()),
      userId: session.userId,
      accessTokenJti: crypto.randomUUID(),
      hashedRefreshToken: session.tokenHash,
      previousHashedRefreshToken: null,
      activeBranchId: session.activeBranchId ?? null,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      status: 'Active',
      expiresAt: session.expiresAt,
      lastActivityAt: new Date(),
      createdAt: new Date(),
    });
  }

  private mapSession(row: any): UserSessionDto {
    return {
      id: row.id as Uuid,
      userId: row.userId as Uuid,
      accessTokenJti: row.id, // mapped to id
      hashedRefreshToken: row.tokenHash,
      previousHashedRefreshToken: row.previousTokenHash ?? null,
      activeBranchId: row.activeBranchId as Uuid | null,
      userAgent: row.userAgent,
      ipAddress: row.ipAddress,
      status: row.status as UserSessionDto['status'],
      expiresAt: row.expiresAt,
      lastActivityAt: row.lastAccessAt,
      createdAt: row.createdAt,
    };
  }

  async create(session: UserSessionDto): Promise<UserSessionDto> {
    const row = await this.prisma.userSession.create({
      data: {
        id: session.id,
        userId: session.userId,
        tokenHash: session.hashedRefreshToken,
        previousTokenHash: session.previousHashedRefreshToken,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        status: session.status,
        expiresAt: session.expiresAt,
        lastAccessAt: session.lastActivityAt,
        activeBranchId: session.activeBranchId,
      } as any,
    });
    return this.mapSession(row);
  }

  async findById(id: Uuid): Promise<UserSessionDto | null> {
    const row = await this.prisma.userSession.findUnique({
      where: { id },
    });
    return row ? this.mapSession(row) : null;
  }

  async findByAccessTokenJti(jti: string): Promise<UserSessionDto | null> {
    const row = await this.prisma.userSession.findUnique({
      where: { id: jti },
    });
    return row ? this.mapSession(row) : null;
  }

  async findByAccessTokenId(id: string): Promise<UserSessionDto | null> {
    return this.findByAccessTokenJti(id);
  }

  async findByHashedRefreshToken(hash: string): Promise<UserSessionDto | null> {
    const row = await this.prisma.userSession.findFirst({
      where: {
        OR: [
          { tokenHash: hash },
          { previousTokenHash: hash },
        ],
      } as any,
    });
    return row ? this.mapSession(row) : null;
  }

  async getSessionByHash(hash: string): Promise<UserSessionDto | null> {
    return this.findByHashedRefreshToken(hash);
  }

  async update(session: UserSessionDto): Promise<UserSessionDto> {
    const row = await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        status: session.status,
        expiresAt: session.expiresAt,
        lastAccessAt: session.lastActivityAt,
        activeBranchId: session.activeBranchId,
        tokenHash: session.hashedRefreshToken,
        previousTokenHash: session.previousHashedRefreshToken,
      } as any,
    });
    return this.mapSession(row);
  }

  async revoke(id: Uuid): Promise<void> {
    await this.prisma.userSession.update({
      where: { id },
      data: { status: 'Revoked' },
    });
  }

  async revokeSessionByHash(hash: string): Promise<void> {
    const session = await this.findByHashedRefreshToken(hash);
    if (session) {
      await this.revoke(session.id);
    }
  }

  async revokeAllForUser(userId: Uuid): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, status: 'Active' },
      data: { status: 'Revoked' },
    });
  }

  async revokeAll(userId: Uuid): Promise<void> {
    await this.revokeAllForUser(userId);
  }

  async listActiveForUser(userId: Uuid): Promise<UserSessionDto[]> {
    const rows = await this.prisma.userSession.findMany({
      where: { userId, status: 'Active' },
    });
    return rows.map((r) => this.mapSession(r));
  }

  async listActive(userId: Uuid): Promise<UserSessionDto[]> {
    return this.listActiveForUser(userId);
  }
}
