import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cookiesMock,
  headersMock,
  verifyAccessTokenMock,
  findByAccessTokenJtiMock,
  decodeSessionMock,
  getPermissionsForRolesMock,
} = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  headersMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
  findByAccessTokenJtiMock: vi.fn(),
  decodeSessionMock: vi.fn(),
  getPermissionsForRolesMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
  headers: headersMock,
}));

vi.mock('@ims/shared-auth', () => ({
  sessionCookieName: 'ims_session',
  decodeSession: decodeSessionMock,
}));

vi.mock('@ims/shared-auth/jwt', () => ({
  JwtService: {
    verifyAccessToken: verifyAccessTokenMock,
  },
}));

vi.mock('./runtime', () => ({
  sessionRepository: {
    findByAccessTokenJti: findByAccessTokenJtiMock,
  },
  effectivePermissionsService: {
    getPermissionsForRoles: getPermissionsForRolesMock,
  },
}));

describe('api middleware session hydration', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'middleware-test-secret-middleware-test-secret';
    cookiesMock.mockReset();
    headersMock.mockReset();
    verifyAccessTokenMock.mockReset();
    findByAccessTokenJtiMock.mockReset();
    decodeSessionMock.mockReset();
    getPermissionsForRolesMock.mockReset();

    verifyAccessTokenMock.mockResolvedValue({
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'admin@ims.com',
      roles: ['SUPER_ADMIN'],
      activeBranchId: null,
      jti: 'jti-1',
    });

    findByAccessTokenJtiMock.mockResolvedValue({
      userId: '11111111-1111-1111-1111-111111111111',
      hashedRefreshToken: 'hash',
      activeBranchId: null,
      status: 'Active',
      expiresAt: new Date(Date.now() + 60_000),
      lastActivityAt: new Date(),
    });

    decodeSessionMock.mockResolvedValue({
      userId: '11111111-1111-1111-1111-111111111111',
      displayName: 'IMS Admin',
      roles: ['SUPER_ADMIN'],
      permissions: [],
      dataScopes: [],
      activeBranchId: null,
      accessTokenJti: 'jti-1',
      hashedRefreshToken: 'hash',
      lastActivityAt: Date.now(),
      status: 'Active',
      expiresAt: Date.now() + 60_000,
    });

    getPermissionsForRolesMock.mockResolvedValue(['crm.leads.read.all', 'lead.read']);

    const cookieHeader = 'ims_access_token=access-token; ims_session=session-token';
    cookiesMock.mockReturnValue({
      get: (name: string) => {
        if (name === 'ims_access_token') return { value: 'access-token' };
        if (name === 'ims_session') return { value: 'session-token' };
        return undefined;
      },
    });
    headersMock.mockReturnValue({
      get: (name: string) => {
        if (name === 'cookie') return cookieHeader;
        if (name === 'authorization') return `Bearer access-token`;
        return null;
      },
    });
  });

  it('hydrates permissions from roles for decoded sessions', async () => {
    const { withAuth } = await import('./api-middleware');

    const context = await withAuth(new Request('http://localhost/api/v1/crm/leads/123', {
      headers: {
        cookie: 'ims_access_token=access-token; ims_session=session-token',
        authorization: 'Bearer access-token',
      },
    }));

    expect(context.session.roles).toEqual(['SUPER_ADMIN']);
    expect(context.session.permissions).toContain('crm.leads.read.all');
    expect(context.session.permissions).toContain('lead.read');
    expect(getPermissionsForRolesMock).toHaveBeenCalledWith(['SUPER_ADMIN']);
  });
});
