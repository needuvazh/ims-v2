import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@ims/shared-kernel';

const withPermissionMock = vi.fn();
const listRolesMock = vi.fn();

vi.mock('../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));
vi.mock('../../../../lib/runtime', () => ({ roleService: { listRoles: listRolesMock } }));
vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('roles route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    listRolesMock.mockReset();
  });

  it('returns forbidden when read permission is missing', async () => {
    const { NextResponse } = await import('next/server');
    withPermissionMock.mockResolvedValue(NextResponse.json({ errorCode: 'FORBIDDEN' }, { status: 400 }));

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/roles'));

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errorCode).toBe('FORBIDDEN');
  });
});
