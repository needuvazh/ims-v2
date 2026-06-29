import type { PrismaClient } from '@prisma/client';
import type { ISessionRepository, UserSessionDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapSession(row: any): UserSessionDto {
    return {
      id: row.id as Uuid,
      userId: row.userId as Uuid,
      accessTokenJti: row.id, // mapped to id
      hashedRefreshToken: row.tokenHash,
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
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        status: session.status,
        expiresAt: session.expiresAt,
        lastAccessAt: session.lastActivityAt,
        activeBranchId: session.activeBranchId,
      },
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

  async findByHashedRefreshToken(hash: string): Promise<UserSessionDto | null> {
    const row = await this.prisma.userSession.findUnique({
      where: { tokenHash: hash },
    });
    return row ? this.mapSession(row) : null;
  }

  async update(session: UserSessionDto): Promise<UserSessionDto> {
    const row = await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        status: session.status,
        expiresAt: session.expiresAt,
        lastAccessAt: session.lastActivityAt,
        activeBranchId: session.activeBranchId,
      },
    });
    return this.mapSession(row);
  }

  async revoke(id: Uuid): Promise<void> {
    await this.prisma.userSession.update({
      where: { id },
      data: { status: 'Revoked' },
    });
  }

  async revokeAllForUser(userId: Uuid): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, status: 'Active' },
      data: { status: 'Revoked' },
    });
  }

  async listActiveForUser(userId: Uuid): Promise<UserSessionDto[]> {
    const rows = await this.prisma.userSession.findMany({
      where: { userId, status: 'Active' },
    });
    return rows.map((r) => this.mapSession(r));
  }
}
