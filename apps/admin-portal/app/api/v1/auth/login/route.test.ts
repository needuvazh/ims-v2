import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IamError } from '@ims/identity-access';

const loginMock = vi.fn();
const rateLimitMock = vi.fn(() => ({ allowed: true, response: null }));

vi.mock('../../../../lib/runtime', () => ({ authService: { login: loginMock } }));
vi.mock('../../../../lib/api-middleware', () => ({ withRateLimit: rateLimitMock }));
vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('auth login route', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret-test-session-secret';
    loginMock.mockReset();
    rateLimitMock.mockReset();
    rateLimitMock.mockReturnValue({ allowed: true, response: null });
  });

  it('returns tokens and cookies on valid credentials', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        username: 'test.user',
        email: 'test@example.com',
        userType: 'Admin',
        status: 'Active',
        defaultBranchId: '11111111-1111-1111-1111-111111111111',
        preferredLanguage: 'en',
      },
      session: {
        userId: 'user-1',
        displayName: 'test.user',
        roles: ['ROLE_ACTIVE'],
        permissions: ['iam.user.read'],
        dataScopes: [],
        activeBranchId: '11111111-1111-1111-1111-111111111111',
        lastActivityAt: Date.now(),
        status: 'Active',
        expiresAt: Date.now() + 60_000,
        accessTokenJti: 'jti-1',
        hashedRefreshToken: 'hash-1',
      },
    });

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Password@123!' }),
    }));

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.user.email).toBe('test@example.com');
    expect(body.data.session.activeBranchId).toBe('11111111-1111-1111-1111-111111111111');
    expect(response.headers.get('set-cookie')).toContain('ims_access_token=access-token');
    expect(response.headers.get('set-cookie')).toContain('ims_refresh_token=refresh-token');
  });

  it('returns invalid credentials for rejected login', async () => {
    loginMock.mockRejectedValue(new IamError('IAM-AUTH-001', 401, 'Invalid credentials.', 'بيانات الاعتماد غير صالحة'));

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'WrongPassword!' }),
    }));

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.errorCode).toBe('IAM-AUTH-001');
    expect(body.detail).toBe('Invalid credentials.');
  });

  it('returns rate limit response before hitting login service', async () => {
    rateLimitMock.mockReturnValueOnce({ allowed: false, response: new Response(JSON.stringify({ errorCode: 'RATE_LIMIT' }), { status: 429, headers: { 'content-type': 'application/json' } }) } as any);

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Password@123!' }),
    }));

    expect(response.status).toBe(429);
    expect(loginMock).not.toHaveBeenCalled();
  });
});
