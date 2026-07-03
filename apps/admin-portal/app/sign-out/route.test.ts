import { beforeEach, describe, expect, it, vi } from 'vitest';

const revokeSessionByHashMock = vi.fn();
const cookiesMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

vi.mock('../lib/runtime', () => ({
  sessionRepository: {
    revokeSessionByHash: revokeSessionByHashMock,
  },
}));

vi.mock('../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
}));

describe('sign-out route', () => {
  beforeEach(() => {
    revokeSessionByHashMock.mockReset();
    cookiesMock.mockReset();
  });

  it('redirects back to the deployed origin instead of localhost', async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: 'session-token' }),
    });

    const { GET } = await import('./route');
    const response = await GET(new Request('https://ims.example.com/sign-out'));

    expect(response.headers.get('location')).toBe('https://ims.example.com/sign-in');
    expect(revokeSessionByHashMock).toHaveBeenCalledTimes(1);
  });
});
