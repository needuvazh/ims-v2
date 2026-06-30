import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IamLoginHistoryPage from './page';

const mockListSecurityLoginHistory = vi.fn();
const mockListUserLoginHistory = vi.fn();
const mockFindByEmail = vi.fn();
const mockFindByUsername = vi.fn();

vi.mock('../../../lib/runtime', () => ({
  loginHistoryQueryService: {
    listSecurityLoginHistory: (...args: any[]) => mockListSecurityLoginHistory(...args),
    listUserLoginHistory: (...args: any[]) => mockListUserLoginHistory(...args),
  },
  userRepository: {
    findByEmail: (...args: any[]) => mockFindByEmail(...args),
    findByUsername: (...args: any[]) => mockFindByUsername(...args),
  },
}));

vi.mock('../../../lib/auth-guard', () => ({
  getSession: () => Promise.resolve({
    userId: 'actor-id',
    permissions: ['iam.user.read', 'iam.security.read'],
    activeBranchId: 'branch-id',
  }),
}));

describe('IamLoginHistoryPage', () => {
  it('renders login history search results and table headers', async () => {
    mockListSecurityLoginHistory.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'history-123',
          createdAt: new Date('2026-06-30T12:00:00.000Z'),
          attemptedEmail: 'test@example.com',
          status: 'Success',
          failureReason: null,
          browser: 'Chrome',
          os: 'macOS',
          device: 'Desktop',
          ipAddress: '127.0.0.1',
          branchId: 'branch-id',
          userId: 'user-123',
        },
      ],
    });

    const page = await IamLoginHistoryPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('Login History');
    expect(html).toContain('test@example.com');
    expect(html).toContain('Chrome / macOS / Desktop');
    expect(html).toContain('Success');
  });
});
