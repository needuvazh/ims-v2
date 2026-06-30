import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IamAuditPage from './page';

const mockListAuditLogs = vi.fn();

vi.mock('../../../lib/runtime', () => ({
  auditQueryService: {
    listAuditLogs: (...args: any[]) => mockListAuditLogs(...args),
  },
}));

vi.mock('../../../lib/auth-guard', () => ({
  getSession: () => Promise.resolve({
    userId: 'actor-id',
    permissions: ['iam.audit.read'],
    activeBranchId: 'branch-id',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/iam/audit',
  useSearchParams: () => new URLSearchParams(),
}));

describe('IamAuditPage', () => {
  it('renders audit entries when logs are available', async () => {
    mockListAuditLogs.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'audit-123',
          performedAt: new Date('2026-06-30T12:00:00.000Z'),
          module: 'iam',
          action: 'iam.user.create',
          entityType: 'User',
          entityId: 'user-123-uuid-etc',
          performedBy: 'actor-id',
          branchId: 'branch-id',
          reason: 'Created new operator',
        },
      ],
    });

    const page = await IamAuditPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('Audit Trail');
    expect(html).toContain('iam.user.create');
    expect(html).toContain('Created new operator');
  });
});
