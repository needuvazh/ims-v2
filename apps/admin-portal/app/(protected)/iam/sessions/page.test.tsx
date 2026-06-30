import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IamSessionsPage from './page';

const mockGetUserById = vi.fn();
const mockListUserSessions = vi.fn();

vi.mock('../../../lib/runtime', () => ({
  userService: {
    getUserById: (...args: any[]) => mockGetUserById(...args),
  },
  sessionService: {
    listUserSessions: (...args: any[]) => mockListUserSessions(...args),
  },
}));

vi.mock('../../../lib/auth-guard', () => ({
  getSession: () => Promise.resolve({
    userId: 'actor-id',
    permissions: ['iam.session.read', 'iam.session.write'],
    activeBranchId: 'branch-id',
  }),
}));

describe('IamSessionsPage', () => {
  it('renders instructions to find sessions when no query is provided', async () => {
    const page = await IamSessionsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('Choose a user ID or email to inspect active sessions');
  });

  it('renders sessions when a valid user id is provided', async () => {
    mockGetUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
    });
    mockListUserSessions.mockResolvedValue([
      {
        id: 'session-456',
        userId: 'user-123',
        activeBranchId: 'branch-id',
        status: 'Active',
        expiresAt: new Date('2026-07-01T00:00:00.000Z'),
        lastActivityAt: new Date('2026-06-30T12:00:00.000Z'),
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      },
    ]);

    const page = await IamSessionsPage({
      searchParams: Promise.resolve({ query: '3bafd9a9-987a-46b8-adfb-0af496bd58cd' }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('Active Sessions');
    expect(html).toContain('session-456');
    expect(html).toContain('test@example.com');
  });
});
