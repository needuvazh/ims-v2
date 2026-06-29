import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@ims/shared-kernel';

const assertPermissionMock = vi.fn();
const listAuditLogsMock = vi.fn();

vi.mock('../../../../lib/auth-guard', () => ({ assertPermission: assertPermissionMock }));
vi.mock('../../../../lib/runtime', () => ({ auditQueryService: { listAuditLogs: listAuditLogsMock } }));
vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('audit route', () => {
  beforeEach(() => {
    assertPermissionMock.mockReset();
    listAuditLogsMock.mockReset();
  });

  it('does not expose a PUT handler', async () => {
    const module = await import('./route');
    expect('PUT' in module).toBe(false);
  });

  it('returns forbidden when audit permission is missing', async () => {
    assertPermissionMock.mockRejectedValue(new DomainError('forbidden', 'Access denied.'));

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/audit'));

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('FORBIDDEN');
  });
});
