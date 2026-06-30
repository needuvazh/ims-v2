import crypto from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAuditLogRepository } from '@ims/audit';
import type { ISessionRepository, UserSessionDto } from '../domain/repositories';
import { SessionService } from './session-service';

function createSession(overrides: Partial<UserSessionDto> = {}): UserSessionDto {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    accessTokenJti: crypto.randomUUID(),
    hashedRefreshToken: 'hash',
    previousHashedRefreshToken: null,
    activeBranchId: null,
    userAgent: null,
    ipAddress: null,
    status: 'Active',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    lastActivityAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SessionService', () => {
  let service: SessionService;
  let repo: ISessionRepository;
  let auditRepo: InMemoryAuditLogRepository;

  const sessions = new Map<string, UserSessionDto>();
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();

  beforeEach(() => {
    sessions.clear();
    auditRepo = new InMemoryAuditLogRepository();

    sessions.set(sessionId, createSession({ id: sessionId, accessTokenJti: sessionId, userId: userId as never }));
    sessions.set(crypto.randomUUID(), createSession({ userId: userId as never }));

    repo = {
      create: async (session) => {
        sessions.set(session.id, session);
        return session;
      },
      findById: async (id) => sessions.get(String(id)) ?? null,
      findByAccessTokenJti: async (jti) => Array.from(sessions.values()).find((session) => session.accessTokenJti === jti) ?? null,
      findByHashedRefreshToken: async () => null,
      update: async (session) => {
        sessions.set(session.id, session);
        return session;
      },
      revoke: async (id) => {
        const session = sessions.get(String(id));
        if (session) session.status = 'Revoked';
      },
      revokeAllForUser: async (targetUserId) => {
        for (const session of sessions.values()) {
          if (session.userId === targetUserId) session.status = 'Revoked';
        }
      },
      listActiveForUser: async (targetUserId) => Array.from(sessions.values()).filter((session) => session.userId === targetUserId && session.status === 'Active'),
    };

    const branchAccessRepo: any = {
      findByUser: async () => [],
      resolveChildBranchIds: async () => [],
    };

    service = new SessionService(repo, auditRepo, branchAccessRepo);
  });

  it('lists active sessions with permission', async () => {
    const result = await service.listUserSessions(userId as never, { actorId: crypto.randomUUID() as never, actorPermissions: ['iam.session.read'], activeBranchId: null });
    expect(result).toHaveLength(2);
  });

  it('terminates a session and records audit', async () => {
    await service.terminateSession(sessionId as never, { actorId: crypto.randomUUID() as never, actorPermissions: ['iam.session.terminate'], activeBranchId: null });

    expect(sessions.get(sessionId)?.status).toBe('Revoked');
    expect(auditRepo.list().some((entry) => entry.action === 'iam.session.terminated')).toBe(true);
  });

  it('terminates all sessions for a user and records audit', async () => {
    await service.terminateAllUserSessions(userId as never, { actorId: crypto.randomUUID() as never, actorPermissions: ['iam.session.terminate'], activeBranchId: null });

    expect(Array.from(sessions.values()).every((session) => session.userId !== userId || session.status === 'Revoked')).toBe(true);
    expect(auditRepo.list().some((entry) => entry.action === 'iam.session.all-terminated')).toBe(true);
  });

  it('rejects missing permission', async () => {
    await expect(service.terminateSession(sessionId as never, { actorId: crypto.randomUUID() as never, actorPermissions: [], activeBranchId: null })).rejects.toMatchObject({ errorCode: 'IAM-AUTHZ-001' });
  });
});
