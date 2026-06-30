import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';

const withPermissionMock = vi.fn();
const searchUsersMock = vi.fn();
const createUserMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();

vi.mock('../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../lib/runtime', () => ({
  userService: { searchUsers: searchUsersMock, createUser: createUserMock },
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
}));

vi.mock('../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('users route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    searchUsersMock.mockReset();
    createUserMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    const { NextResponse } = await import('next/server');
    withPermissionMock.mockResolvedValue(NextResponse.json({ errorCode: 'UNAUTHORIZED' }, { status: 401 }));

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/users'));

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.errorCode).toBe('UNAUTHORIZED');
  });

  it('returns 403 when permission is missing', async () => {
    const { NextResponse } = await import('next/server');
    withPermissionMock.mockResolvedValue(NextResponse.json({ errorCode: 'FORBIDDEN' }, { status: 403 }));

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/users'));

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('FORBIDDEN');
  });

  it('lists users when authorized', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) => cb({ session: { userId: 'user-1', permissions: ['iam.user.read'], activeBranchId: '11111111-1111-1111-1111-111111111111' } }));
    searchUsersMock.mockResolvedValue({ items: [{ id: 'user-1', username: 'user.one', email: 'user@example.com', userType: 'Admin', status: 'Active', defaultBranchId: null, preferredLanguage: 'en', effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'), effectiveEndDate: null }], total: 1 });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/users?page=1&pageSize=20'));

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.total).toBe(1);
    expect(body.data.items[0].email).toBe('user@example.com');
  });

  it('returns duplicate email for create user', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) => cb({ session: { userId: 'user-1', permissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' } }));
    createUserMock.mockRejectedValue(new IamError('IAM-VAL-001', 400, 'Email already exists', 'البريد الإلكتروني موجود بالفعل'));

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'duplicate@example.com',
        userType: 'Admin',
        roleIds: ['11111111-1111-1111-1111-111111111111'],
        branchIds: ['11111111-1111-1111-1111-111111111111'],
      }),
    }));

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errorCode).toBe('IAM-VAL-001');
  });

  it('returns invalid field error for malformed email on create user', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) => cb({ session: { userId: 'user-1', permissions: ['iam.user.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' } }));

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        userType: 'Admin',
        roleIds: ['11111111-1111-1111-1111-111111111111'],
        branchIds: ['11111111-1111-1111-1111-111111111111'],
      }),
    }));

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errorCode).toBe('IAM-VAL-USERS-INVALID_BODY');
    expect(body.invalidFields?.some((field: { field: string }) => field.field === 'email')).toBe(true);
  });

  it('returns forbidden when create permission is missing', async () => {
    const { NextResponse } = await import('next/server');
    withPermissionMock.mockResolvedValue(NextResponse.json({ errorCode: 'FORBIDDEN' }, { status: 403 }));

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        userType: 'Admin',
        roleIds: ['11111111-1111-1111-1111-111111111111'],
        branchIds: ['11111111-1111-1111-1111-111111111111'],
      }),
    }));

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('FORBIDDEN');
  });

  it('returns forbidden when branch scope is bypassed', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) => cb({ session: { userId: 'user-1', permissions: ['iam.user.read'], activeBranchId: '11111111-1111-1111-1111-111111111111' } }));
    resolveAllowedBranchesMock.mockResolvedValue([]); // No branches allowed

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/users?branchId=22222222-2222-2222-2222-222222222222'));

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('FORBIDDEN');
  });
});

